import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { fetchDailyOhlcForAsset } from "./alphaVantageClient";
import type { TimeSeriesDailyResponse } from "./types";

type PriceHistoryRow = Database["public"]["Tables"]["price_history"]["Row"];

const SERVICE_SUPABASE_URL =
  (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
const SERVICE_SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceRoleClient() {
  if (!SERVICE_SUPABASE_URL || !SERVICE_SUPABASE_SERVICE_KEY) {
    throw new Error("[forecast] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(SERVICE_SUPABASE_URL, SERVICE_SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function syncDailyPriceHistoryForAsset(symbol: string): Promise<{ inserted: number }> {
  const client = getServiceRoleClient();
  const timeframe = "1d";

  const resp = await fetchDailyOhlcForAsset(symbol);
  if (!resp || !resp["Time Series (Daily)"]) {
    // eslint-disable-next-line no-console
    console.warn("[forecast] No TIME_SERIES_DAILY data for", symbol);
    return { inserted: 0 };
  }

  const series: NonNullable<TimeSeriesDailyResponse["Time Series (Daily)"]> = resp["Time Series (Daily)"] ?? {};
  const entries = Object.entries(series);

  const rows: Omit<PriceHistoryRow, "id" | "created_at">[] = entries.map(([date, ohlc]) => {
    const ts = new Date(`${date}T00:00:00Z`).toISOString();
    return {
      asset: symbol,
      timeframe,
      ts,
      open: Number(ohlc["1. open"]),
      high: Number(ohlc["2. high"]),
      low: Number(ohlc["3. low"]),
      close: Number(ohlc["4. close"]),
      volume: Number(ohlc["5. volume"]),
      source: "alphavantage",
    };
  });

  // Upsert by (asset, timeframe, ts)
  const { error } = await client
    .from("price_history")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(rows as any, { onConflict: "asset,timeframe,ts" });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] Failed to upsert price_history", error);
    return { inserted: 0 };
  }

  return { inserted: rows.length };
}

// Backwards-compatible helper for existing jobs/endpoints focused on XAUUSD.
export async function syncDailyPriceHistoryForXauusd(): Promise<{ inserted: number }> {
  return syncDailyPriceHistoryForAsset("XAUUSD");
}
