import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";
import { syncDailyPriceHistoryForAsset } from "../../../../lib/forecast/priceHistoryService";

export const prerender = false;

/**
 * POST /api/admin/cron/sync-all-assets-price-history
 *
 * Dedykowany endpoint dla Vercel Cron Jobs.
 * Synchronizuje historię cen dla WSZYSTKICH assetów z tabeli assets.
 * Zabezpieczony przez X-CRON-SECRET header.
 *
 * Body (opcjonalnie): { symbols?: string[] } - jeśli podane, synchronizuje tylko te symbole
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

  // Użyj service role key do pobrania listy assetów
  const url = import.meta.env.SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  const { symbols } = (body as { symbols?: unknown }) ?? {};

  // Jeśli podano konkretne symbole, użyj ich; w przeciwnym razie pobierz wszystkie z bazy
  let symbolsToSync: string[];

  if (Array.isArray(symbols) && symbols.length > 0) {
    symbolsToSync = symbols
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim().toUpperCase());
  } else {
    // Pobierz wszystkie asset z bazy
    const { data: assets, error: assetsError } = await supabase.from("assets").select("symbol");

    if (assetsError) {
      return new Response(JSON.stringify({ error: `Failed to fetch assets: ${assetsError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No assets found in database", results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    symbolsToSync = assets.map((a) => a.symbol.toUpperCase());
  }

  // Synchronizuj każdy asset
  const results: { symbol: string; inserted: number; error?: string }[] = [];

  for (const symbol of symbolsToSync) {
    try {
      const result = await syncDailyPriceHistoryForAsset(symbol);
      results.push({ symbol, inserted: result.inserted });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({ symbol, inserted: 0, error: errorMessage });
      // eslint-disable-next-line no-console
      console.error(`[cron] Failed to sync price history for ${symbol}:`, errorMessage);
    }
  }

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;

  return new Response(
    JSON.stringify({
      ok: true,
      totalAssets: symbolsToSync.length,
      successCount,
      errorCount,
      totalInserted,
      results,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
