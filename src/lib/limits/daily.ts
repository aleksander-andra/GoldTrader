import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { requireUser } from "../auth/rbac";

interface Ok {
  ok: true;
  remaining: number;
  limit: number;
}
interface Err {
  ok: false;
  response: Response;
}

function tooMany(limit: number, remaining: number): Err {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: "Daily limit exceeded" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(Math.max(0, remaining)),
      },
    }),
  };
}

export async function enforceDailyLimit(context: APIContext, key: string, maxPerDay: number): Promise<Ok | Err> {
  const user = await requireUser(context);
  if (!user.ok) return user;
  const token = context.request.headers.get("authorization");
  const url = import.meta.env.SUPABASE_URL;
  const anon = import.meta.env.SUPABASE_ANON_KEY;
  if (!token || !url || !anon) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const today = new Date();
  const day = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: token } },
  });

  // Upsert counter row if not exists
  const base = {
    user_id: user.value.userId,
    day,
    key,
  };

  // Insert row if missing (best-effort; if table doesn't exist, skip limiting)
  const up = await supabase
    .from("usage_counters")
    .upsert([{ ...base }], { onConflict: "user_id,day,key", ignoreDuplicates: true });
  if (up.error && /usage_counters|relation|does not exist/i.test(up.error.message || "")) {
    return { ok: true, remaining: maxPerDay, limit: maxPerDay };
  }

  // Fetch current count
  const { data: current, error: selErr } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("user_id", user.value.userId)
    .eq("day", day)
    .eq("key", key)
    .maybeSingle();

  if (selErr) {
    if (/usage_counters|relation|does not exist/i.test(selErr.message || "")) {
      return { ok: true, remaining: maxPerDay, limit: maxPerDay };
    }
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: selErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const currentCount = current?.count ?? 0;
  if (currentCount >= maxPerDay) {
    return tooMany(maxPerDay, maxPerDay - currentCount);
  }

  // Increment
  const { data: after, error: updErr } = await supabase
    .from("usage_counters")
    .update({ count: currentCount + 1 })
    .eq("user_id", user.value.userId)
    .eq("day", day)
    .eq("key", key)
    .select("count")
    .maybeSingle();

  if (updErr) {
    if (/usage_counters|relation|does not exist/i.test(updErr.message || "")) {
      return { ok: true, remaining: maxPerDay - (currentCount + 1), limit: maxPerDay };
    }
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const newCount = after?.count ?? currentCount + 1;
  const remaining = Math.max(0, maxPerDay - newCount);
  return { ok: true, remaining, limit: maxPerDay };
}
