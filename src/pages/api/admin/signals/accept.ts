import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";
import { requireAdmin } from "../../../../lib/auth/rbac";

export const prerender = false;

// POST /api/admin/signals/accept
// Body: { id: string }
export async function POST(context: APIContext) {
  const admin = await requireAdmin(context);
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = (body as { id?: unknown }) ?? {};
  const idStr = typeof id === "string" && id.trim() ? id.trim() : null;

  if (!idStr) {
    return new Response(JSON.stringify({ error: "Missing signal id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = import.meta.env.SUPABASE_URL;
  const anon = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokenHeader = context.request.headers.get("authorization");

  const supabase = createClient<Database>(url, anon, {
    global: tokenHeader ? { headers: { Authorization: tokenHeader } } : undefined,
  });

  const { data, error } = await supabase
    .from("signals")
    .update({ status: "accepted" })
    .eq("id", idStr)
    .eq("status", "candidate")
    .select("*")
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!data) {
    return new Response(JSON.stringify({ error: "Signal not found or not a candidate" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, item: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
