import { getEngineeredFeaturesForXauusdDaily, type EngineeredFeatureRow } from "./featureEngineering";

const SERVICE_SUPABASE_URL =
  (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
const SERVICE_SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export type BaselineDirection = "UP" | "DOWN" | "FLAT";

export interface BaselineForecast {
  asset: string;
  timeframe: "1d";
  horizon: "1d";
  decision: BaselineDirection;
  confidence: number;
  asOf: string;
  reason: string;
}

function majorityLabel(labels: (BaselineDirection | null)[]): BaselineDirection | null {
  const counts: Record<BaselineDirection, number> = { UP: 0, DOWN: 0, FLAT: 0 };
  for (const l of labels) {
    if (!l) continue;
    counts[l] += 1;
  }
  const entries = Object.entries(counts) as [BaselineDirection, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [topLabel, topCount] = entries[0];
  if (topCount === 0) return null;
  return topLabel;
}

function describeDecision(decision: BaselineDirection, last: EngineeredFeatureRow | undefined): string {
  if (!last) {
    return "Brak danych historycznych – decyzja neutralna.";
  }

  const parts: string[] = [];
  parts.push("Prosty model bazowy na dziennych świecach XAUUSD.");

  if (last.sma5 != null && last.sma20 != null) {
    if (last.sma5 > last.sma20) {
      parts.push("SMA(5) jest powyżej SMA(20), co sugeruje krótkoterminowy trend wzrostowy.");
    } else if (last.sma5 < last.sma20) {
      parts.push("SMA(5) jest poniżej SMA(20), co sugeruje krótkoterminowy trend spadkowy.");
    } else {
      parts.push("SMA(5) jest bardzo blisko SMA(20), brak wyraźnego trendu.");
    }
  }

  if (decision === "UP") {
    parts.push("Większość ostatnich ruchów była wzrostowa.");
  } else if (decision === "DOWN") {
    parts.push("Większość ostatnich ruchów była spadkowa.");
  } else {
    parts.push("Brak wyraźnej przewagi strony popytu lub podaży.");
  }

  return parts.join(" ");
}

export async function getBaselineForecastForXauusd(): Promise<BaselineForecast | null> {
  const { asset, items } = await getEngineeredFeaturesForXauusdDaily(200);

  // When there are no engineered items, we distinguish between two cases:
  // 1) service-role credentials are missing (e.g. CI without secrets) –
  //    return a neutral FLAT forecast so public API keeps returning 200.
  // 2) credentials are present but there is truly no history yet –
  //    return null so that the handler can expose 503 as documented.
  if (!items.length) {
    const hasServiceRole = Boolean(SERVICE_SUPABASE_URL && SERVICE_SUPABASE_SERVICE_KEY);
    if (!hasServiceRole) {
      const nowIso = new Date().toISOString();
      return {
        asset,
        timeframe: "1d",
        horizon: "1d",
        decision: "FLAT",
        confidence: 0,
        asOf: nowIso,
        reason: "Brak danych historycznych lub konfiguracji Supabase – zwracam neutralną prognozę bazową (FLAT).",
      };
    }

    return null;
  }

  const last = items[items.length - 1];

  // Bierzemy z okna ostatnich 10 punktów labelki (bez ostatniego, który użyłby przyszłości).
  const windowSize = 10;
  const startIdx = Math.max(0, items.length - 1 - windowSize);
  const endIdx = items.length - 1;
  const recent = items.slice(startIdx, endIdx);

  const recentLabels = recent.map((r) => r.label ?? null) as (BaselineDirection | null)[];
  let decision = majorityLabel(recentLabels);

  if (!decision) {
    // Fallback – jeśli brak etykiet, patrzymy na SMA(5)/SMA(20).
    if (last.sma5 != null && last.sma20 != null) {
      if (last.sma5 > last.sma20) decision = "UP";
      else if (last.sma5 < last.sma20) decision = "DOWN";
      else decision = "FLAT";
    } else {
      decision = "FLAT";
    }
  }

  // Prosty mapping pewności: im więcej spójnych labeli, tym wyższa confidence.
  const sameAsDecision = recentLabels.filter((l) => l === decision).length;
  let confidence = 40 + sameAsDecision * 6; // 40–100
  if (!Number.isFinite(confidence)) confidence = 50;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const asOf = last.ts;
  const reason = describeDecision(decision, last);

  return {
    asset,
    timeframe: "1d",
    horizon: "1d",
    decision,
    confidence,
    asOf,
    reason,
  };
}
