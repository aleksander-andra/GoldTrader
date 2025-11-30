import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types";
import { enforceDailyLimit } from "../../../lib/limits/daily";

export const prerender = false;

// GET /api/signals?symbol=XAUUSD
export async function GET(context: APIContext) {
  // Daily limit for listing signals (per user, per day)
  const limit = await enforceDailyLimit(context, "signals:list", 100);
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

  const requestUrl = new URL(context.request.url);
  const symbol = requestUrl.searchParams.get("symbol") ?? "XAUUSD";

  let assetId: string | undefined;
  if (symbol) {
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("id")
      .eq("symbol", symbol)
      .maybeSingle();

    if (assetError) {
      return new Response(JSON.stringify({ error: assetError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!asset) {
      return new Response(JSON.stringify({ error: "Asset not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    assetId = asset.id;
  }

  const query = supabase.from("signals").select("*").order("ts", { ascending: false }).limit(100);

  const finalQuery = assetId ? query.eq("asset_id", assetId) : query;

  const { data, error } = await finalQuery;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ items: data ?? [] }), {
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(limit.limit),
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  });
}
