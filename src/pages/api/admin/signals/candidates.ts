import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";
import { requireAdmin } from "../../../../lib/auth/rbac";

export const prerender = false;

// GET /api/admin/signals/candidates?symbol=XAUUSD&limit=50
// Zwraca sygnały w statusie 'candidate' (kandydaci do akceptacji), opcjonalnie
// filtrowane po symbolu aktywa.
export async function GET(context: APIContext) {
  const admin = await requireAdmin(context);
  if (!admin.ok) return admin.response;

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

  const requestUrl = new URL(context.request.url);
  const symbol = requestUrl.searchParams.get("symbol") ?? "XAUUSD";
  const limitParam = requestUrl.searchParams.get("limit");
  const limitNum = limitParam ? Number(limitParam) : Number.NaN;
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(100, Math.floor(limitNum)) : 50;

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

  const baseQuery = supabase
    .from("signals")
    .select(
      "id, asset_id, type, confidence, status, valid_from, valid_to, strategy_id, strategies(name,type), assets(symbol)"
    )
    .eq("status", "candidate")
    .order("valid_from", { ascending: true })
    .limit(limit);

  const finalQuery = assetId ? baseQuery.eq("asset_id", assetId) : baseQuery;

  const { data, error } = await finalQuery;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ items: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
