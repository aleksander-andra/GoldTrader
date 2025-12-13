import type { APIContext } from "astro";
import { requireAdmin } from "../../../../lib/auth/rbac";
import { enforceDailyLimit } from "../../../../lib/limits/daily";
import { syncDailyPriceHistoryForAsset } from "../../../../lib/forecast/priceHistoryService";

export const prerender = false;

// POST /api/admin/price-history/sync
// Body (opcjonalnie): { symbol?: string }
// Admin endpoint to sync daily OHLC for given asset (default XAUUSD) into price_history (Alpha Vantage).
export async function POST(context: APIContext) {
  const admin = await requireAdmin(context);
  if (!admin.ok) return admin.response;

  const daily = await enforceDailyLimit(context, "price-history:sync", 5);
  if (!daily.ok) return daily.response;

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
