import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

type PriceHistoryRow = Database["public"]["Tables"]["price_history"]["Row"];

type DirectionLabel = "UP" | "DOWN" | "FLAT";

export interface EngineeredFeatureRow {
  ts: string;
  close: number;
  logReturn1d: number | null;
  sma5: number | null;
  sma20: number | null;
  vol5: number | null;
  vol20: number | null;
  label: DirectionLabel | null;
}

const SERVICE_SUPABASE_URL =
  (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
const SERVICE_SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceRoleClient() {
  if (!SERVICE_SUPABASE_URL || !SERVICE_SUPABASE_SERVICE_KEY) {
    throw new Error("[forecast] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for featureEngineering");
  }

  return createClient<Database>(SERVICE_SUPABASE_URL, SERVICE_SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function rollingMean(values: number[], window: number, index: number): number | null {
  if (index + 1 < window) return null;
  let sum = 0;
  for (let i = index - window + 1; i <= index; i += 1) {
    sum += values[i] ?? 0;
  }
  return sum / window;
}

function rollingStd(values: number[], window: number, index: number): number | null {
  if (index + 1 < window) return null;
  const mean = rollingMean(values, window, index);
  if (mean == null) return null;
  let sumSq = 0;
  for (let i = index - window + 1; i <= index; i += 1) {
    const v = values[i] ?? 0;
    sumSq += (v - mean) * (v - mean);
  }
  const variance = sumSq / window;
  return Math.sqrt(variance);
}

function labelDirection(currentClose: number, nextClose: number | null): DirectionLabel | null {
  if (!Number.isFinite(currentClose) || !Number.isFinite(nextClose)) return null;

  // Prosty próg 0.1% – wszystko pomiędzy traktujemy jako FLAT.
  const eps = 0.001;
  const change = (Number(nextClose) - currentClose) / currentClose;
  if (change > eps) return "UP";
  if (change < -eps) return "DOWN";
  return "FLAT";
}

export function engineerFeaturesFromHistory(rows: PriceHistoryRow[]): EngineeredFeatureRow[] {
  if (!rows.length) return [];

  // Sortuj rosnąco po ts (na wszelki wypadek).
  const sorted = [...rows].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const closes = sorted.map((r) => Number(r.close));
  const logReturns: (number | null)[] = closes.map((close, idx) => {
    if (idx === 0) return null;
    const prev = closes[idx - 1];
    if (!Number.isFinite(close) || !Number.isFinite(prev) || prev <= 0) return null;
    return Math.log(close / prev);
  });

  const result: EngineeredFeatureRow[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const row = sorted[i];
    const next = sorted[i + 1];
    const currentClose = closes[i];
    const nextClose = next ? closes[i + 1] : null;

    const engineered: EngineeredFeatureRow = {
      ts: row.ts,
      close: currentClose,
      logReturn1d: logReturns[i],
      sma5: rollingMean(closes, 5, i),
      sma20: rollingMean(closes, 20, i),
      vol5: rollingStd(
        logReturns.map((v) => (v == null ? 0 : v)),
        5,
        i
      ),
      vol20: rollingStd(
        logReturns.map((v) => (v == null ? 0 : v)),
        20,
        i
      ),
      label: labelDirection(currentClose, nextClose),
    };

    result.push(engineered);
  }

  return result;
}

export async function getEngineeredFeaturesForXauusdDaily(
  limit = 200
): Promise<{ asset: string; timeframe: string; items: EngineeredFeatureRow[] }> {
  const asset = "XAUUSD";
  const timeframe = "1d";

  // In environments without service-role credentials (e.g. CI without secrets),
  // fall back to an empty feature set instead of throwing, so that public
  // endpoints can still respond with a neutral forecast.
  if (!SERVICE_SUPABASE_URL || !SERVICE_SUPABASE_SERVICE_KEY) {
    // eslint-disable-next-line no-console
    console.error(
      "[forecast] getEngineeredFeaturesForXauusdDaily: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY – returning empty items"
    );
    return { asset, timeframe, items: [] };
  }

  const client = getServiceRoleClient();

  const { data, error } = await client
    .from("price_history")
    .select("*")
    .eq("asset", asset)
    .eq("timeframe", timeframe)
    .order("ts", { ascending: true })
    .limit(limit);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] Failed to load price_history for featureEngineering", error);
    return { asset, timeframe, items: [] };
  }

  const engineered = engineerFeaturesFromHistory(data ?? []);
  return { asset, timeframe, items: engineered };
}
