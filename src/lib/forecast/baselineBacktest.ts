import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { engineerFeaturesFromHistory } from "./featureEngineering";

type PriceHistoryRow = Database["public"]["Tables"]["price_history"]["Row"];
type DirectionLabel = "UP" | "DOWN" | "FLAT";

interface BaselineBacktestResult {
  windowDays: number;
  totalSamples: number;
  correct: number;
  accuracy: number; // 0–1
}

const SERVICE_SUPABASE_URL =
  (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
const SERVICE_SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceRoleClient() {
  if (!SERVICE_SUPABASE_URL || !SERVICE_SUPABASE_SERVICE_KEY) {
    throw new Error("[forecast] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for baselineBacktest");
  }

  return createClient<Database>(SERVICE_SUPABASE_URL, SERVICE_SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function majorityLabel(labels: (DirectionLabel | null)[]): DirectionLabel | null {
  const counts: Record<DirectionLabel, number> = { UP: 0, DOWN: 0, FLAT: 0 };
  for (const l of labels) {
    if (!l) continue;
    counts[l] += 1;
  }
  const entries = Object.entries(counts) as [DirectionLabel, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [top, count] = entries[0];
  return count === 0 ? null : top;
}

/**
 * Oblicza „prawdziwy” kierunek ruchu na podstawie labelki z featureEngineering
 * (tam label = kierunek następnego dnia).
 */
function trueDirectionFromLabel(label: DirectionLabel | null): DirectionLabel | null {
  return label;
}

/**
 * Dla danego indeksu i zwraca decyzję baseline zgodnie z heurystyką:
 * - większość etykiet z ostatniego okna (bez bieżącej),
 * - fallback: SMA(5) vs SMA(20),
 * - jeśli brak sygnału: FLAT.
 */
function baselineDecisionAtIndex(
  rows: ReturnType<typeof engineerFeaturesFromHistory>,
  index: number,
  windowSize = 10
): DirectionLabel {
  const current = rows[index];
  if (!current) return "FLAT";

  // okno etykiet z przeszłości (bez bieżącej, żeby nie używać przyszłości)
  const start = Math.max(0, index - windowSize);
  const past = rows.slice(start, index);
  const pastLabels = past.map((r) => (r.label ?? null) as DirectionLabel | null);

  let decision = majorityLabel(pastLabels);
  if (!decision) {
    if (current.sma5 != null && current.sma20 != null) {
      if (current.sma5 > current.sma20) decision = "UP";
      else if (current.sma5 < current.sma20) decision = "DOWN";
      else decision = "FLAT";
    } else {
      decision = "FLAT";
    }
  }

  return decision ?? "FLAT";
}

/**
 * Prosty backtest: jak często baseline trafia kierunek ruchu następnego dnia
 * na ostatnich windowDays dniach.
 */
export async function computeBaselineAccuracy(windowDays = 90): Promise<BaselineBacktestResult> {
  const client = getServiceRoleClient();

  const { data, error } = await client
    .from("price_history")
    .select("*")
    .eq("asset", "XAUUSD")
    .eq("timeframe", "1d")
    .order("ts", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] baselineBacktest: failed to load price_history", error);
    return { windowDays, totalSamples: 0, correct: 0, accuracy: 0 };
  }

  const rows = (data ?? []) as PriceHistoryRow[];
  if (rows.length < 2) {
    return { windowDays, totalSamples: 0, correct: 0, accuracy: 0 };
  }

  // policz featury + labelki (label = kierunek następnego dnia)
  const engineered = engineerFeaturesFromHistory(rows);

  // ogranicz się do ostatnich windowDays.
  const cutoffTs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const filtered = engineered.filter((r) => new Date(r.ts).getTime() >= cutoffTs);

  let total = 0;
  let correct = 0;

  for (let i = 0; i < filtered.length - 1; i += 1) {
    const idx = engineered.indexOf(filtered[i]);
    if (idx < 0 || idx >= engineered.length - 1) continue;

    const baselineDir = baselineDecisionAtIndex(engineered, idx);
    const trueDir = trueDirectionFromLabel(engineered[idx].label);

    if (!trueDir) continue;

    total += 1;
    if (baselineDir === trueDir) {
      correct += 1;
    }
  }

  const accuracy = total > 0 ? correct / total : 0;

  return {
    windowDays,
    totalSamples: total,
    correct,
    accuracy,
  };
}
