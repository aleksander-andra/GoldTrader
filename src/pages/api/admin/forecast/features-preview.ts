import type { APIContext } from "astro";
import { getEngineeredFeaturesForXauusdDaily } from "../../../../lib/forecast/featureEngineering";

export const prerender = false;

// GET /api/admin/forecast/features-preview
// Simple admin/cron-style endpoint to inspect engineered features for XAUUSD daily candles.
// Security: expects X-Cron-Secret header matching NEWS_CRON_SECRET env (same as other admin tasks).
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
  const limitParam = url.searchParams.get("limit");
  const limitNum = limitParam ? Number(limitParam) : Number.NaN;
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(500, Math.max(10, limitNum)) : 200;

  try {
    const { asset, timeframe, items } = await getEngineeredFeaturesForXauusdDaily(limit);
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
    console.error("[forecast] features-preview failed", error);
    return new Response(JSON.stringify({ error: "Failed to build feature preview" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
