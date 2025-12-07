import type { APIContext } from "astro";
import { syncDailyPriceHistoryForXauusd } from "../../../lib/forecast/priceHistoryService";

export const prerender = false;

// POST /api/admin/sync-price-history
// Simple admin/cron endpoint to sync daily OHLC for XAUUSD into price_history.
// Security: expects X-Cron-Secret header matching NEWS_CRON_SECRET env (reuses existing secret).
export async function POST(context: APIContext) {
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

  try {
    const result = await syncDailyPriceHistoryForXauusd();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] sync-price-history failed", error);
    return new Response(JSON.stringify({ error: "Failed to sync price history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
