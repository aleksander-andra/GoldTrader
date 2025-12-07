import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types";

export const prerender = false;

const SERVICE_SUPABASE_URL =
  (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
const SERVICE_SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceRoleClient() {
  if (!SERVICE_SUPABASE_URL || !SERVICE_SUPABASE_SERVICE_KEY) {
    throw new Error("[forecast] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for public forecast history");
  }

  return createClient<Database>(SERVICE_SUPABASE_URL, SERVICE_SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET /api/forecast/history
// Public, read-only podgląd ostatnich prognoz z price_forecasts (bez sekretnych nagłówków).
export async function GET(context: APIContext) {
  const url = new URL(context.request.url);
  const assetParam = url.searchParams.get("asset");
  const tfParam = url.searchParams.get("timeframe");
  const limitParam = url.searchParams.get("limit");

  const asset = assetParam && assetParam.trim() ? assetParam.trim().toUpperCase() : "XAUUSD";
  const timeframe = tfParam && tfParam.trim() ? tfParam.trim() : "1d";

  const limitNum = limitParam ? Number(limitParam) : Number.NaN;
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(100, Math.max(1, limitNum)) : 30;

  try {
    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("price_forecasts")
      .select(
        "asset, timeframe, forecast_horizon, target_type, prediction_value, prediction_direction, model_type, model_version, valid_from, valid_to, created_at"
      )
      .eq("asset", asset)
      .eq("timeframe", timeframe)
      .order("valid_from", { ascending: false })
      .limit(limit);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[forecast] public forecast history query failed", error);
      return new Response(JSON.stringify({ error: "Failed to load forecast history" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const items = data ?? [];

    // Zwróć w kolejności rosnącej po czasie (łatwiej rysować wykres).
    items.sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime());

    return new Response(
      JSON.stringify({
        asset,
        timeframe,
        count: items.length,
        items,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] public forecast history handler failed", error);
    return new Response(JSON.stringify({ error: "Failed to load forecast history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
