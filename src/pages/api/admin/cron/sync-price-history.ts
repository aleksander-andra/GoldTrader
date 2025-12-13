import type { APIContext } from "astro";
import { syncDailyPriceHistoryForAsset } from "../../../../lib/forecast/priceHistoryService";

export const prerender = false;

/**
 * POST /api/admin/cron/sync-price-history
 *
 * Dedykowany endpoint dla Vercel Cron Jobs.
 * Synchronizuje historię cen dla aktywów (domyślnie XAUUSD).
 * Zabezpieczony przez X-CRON-SECRET header.
 *
 * Body (opcjonalnie): { symbol?: string }
 */
export async function POST(context: APIContext) {
  // Weryfikuj secret header
  const cronSecret = context.request.headers.get("x-cron-secret");
  const expectedSecret = import.meta.env.CRON_SECRET;

  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Invalid or missing X-CRON-SECRET" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  const { symbol } = (body as { symbol?: unknown }) ?? {};
  const symbolStr = typeof symbol === "string" && symbol.trim() ? symbol.trim().toUpperCase() : "XAUUSD";

  try {
    const result = await syncDailyPriceHistoryForAsset(symbolStr);
    return new Response(JSON.stringify({ ok: true, symbol: symbolStr, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Failed to sync price history for ${symbolStr}`;
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
