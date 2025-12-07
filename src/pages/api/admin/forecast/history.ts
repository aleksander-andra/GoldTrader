import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";

export const prerender = false;

const SERVICE_SUPABASE_URL =
  (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
const SERVICE_SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceRoleClient() {
  if (!SERVICE_SUPABASE_URL || !SERVICE_SUPABASE_SERVICE_KEY) {
    throw new Error("[forecast] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for forecast history");
  }

  return createClient<Database>(SERVICE_SUPABASE_URL, SERVICE_SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET /api/admin/forecast/history
// Zwraca ostatnie prognozy z price_forecasts dla podanego assetu/timeframe.
// Security: X-Cron-Secret = NEWS_CRON_SECRET (jak inne admin endpointy).
export async function GET(context: APIContext) {
  const secretRaw =
    (typeof process !== "undefined" && process.env.NEWS_CRON_SECRET) || import.meta.env.NEWS_CRON_SECRET;
  const cronSecret = typeof secretRaw === "string" ? secretRaw.trim() : "";
  const headerRaw = context.request.headers.get("x-cron-secret");
  const header = headerRaw ? headerRaw.trim() : "";

  if (!cronSecret || !header || header !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(context.request.url);
  const assetParam = url.searchParams.get("asset");
  const tfParam = url.searchParams.get("timeframe");
  const limitParam = url.searchParams.get("limit");

  const asset = assetParam && assetParam.trim() ? assetParam.trim().toUpperCase() : "XAUUSD";
  const timeframe = tfParam && tfParam.trim() ? tfParam.trim() : "1d";

  const limitNum = limitParam ? Number(limitParam) : Number.NaN;
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(100, Math.max(1, limitNum)) : 20;

  try {
    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("price_forecasts")
      .select("*")
      .eq("asset", asset)
      .eq("timeframe", timeframe)
      .order("valid_from", { ascending: false })
      .limit(limit);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[forecast] forecast history query failed", error);
      return new Response(JSON.stringify({ error: "Failed to load forecast history" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        asset,
        timeframe,
        count: data?.length ?? 0,
        items: data ?? [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] forecast history handler failed", error);
    return new Response(JSON.stringify({ error: "Failed to load forecast history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
