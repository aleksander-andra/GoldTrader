import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types";
import { requireAdmin } from "../../../lib/auth/rbac";
import { enforceDailyLimit } from "../../../lib/limits/daily";

export const prerender = false;

// GET /api/assets
export async function GET(context: APIContext) {
  // Daily limit for listing assets (per user, per day)
  const limit = await enforceDailyLimit(context, "assets:list", 100);
  if (!limit.ok) return limit.response;

  const authHeader = context.request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.from("assets").select("*").order("symbol", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ items: data }), {
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(limit.limit),
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  });
}

// POST /api/assets (admin only)
export async function POST(context: APIContext) {
  const admin = await requireAdmin(context);
  if (!admin.ok) return admin.response;

  const authHeader = context.request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { symbol, name, currency } = (body as Record<string, unknown>) || {};
  if (
    typeof symbol !== "string" ||
    typeof name !== "string" ||
    typeof currency !== "string" ||
    !symbol.trim() ||
    !name.trim() ||
    !currency.trim()
  ) {
    return new Response(JSON.stringify({ error: "Missing or invalid fields: symbol, name, currency" }), {
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

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];
  const toInsert: AssetInsert = {
    symbol: symbol.trim(),
    name: name.trim(),
    currency: currency.trim(),
  };

  // Type cast due to generated Database typing not wiring insert payload inference here
  const insertPayload = [toInsert] as unknown as Database["public"]["Tables"]["assets"]["Insert"][];
  // @ts-expect-error Manual Database typing may not infer insert payload type for supabase-js generics here
  const { data, error } = await supabase.from("assets").insert(insertPayload).select("*").maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ item: data }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
