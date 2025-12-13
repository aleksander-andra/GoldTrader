import type { SupabaseDbClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import { getBaselineForecastForXauusd } from "../forecast/baselineModel";
import { getNewsEventsForAsset } from "../news/newsService";

type StrategyRow = Database["public"]["Tables"]["strategies"]["Row"];
type StrategyInsert = Database["public"]["Tables"]["strategies"]["Insert"];
type SignalInsert = Database["public"]["Tables"]["signals"]["Insert"];
type SignalRow = Database["public"]["Tables"]["signals"]["Row"];

export interface GenerateSignalsOptions {
  assetId: string;
  assetSymbol: string;
  maxSignals?: number;
  validForMinutes?: number;
  lookbackMinutes?: number;
  validFromOffsetMinutes?: number;
  validToOffsetMinutes?: number;
}

interface GenerateSignalsResult {
  strategy: StrategyRow;
  inserted: SignalRow[];
}

async function ensureBaselineStrategy(supabase: SupabaseDbClient): Promise<StrategyRow> {
  // Szukamy aktywnej strategii typu 'baseline'.
  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("type", "baseline")
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as StrategyRow;
  }

  const toInsert: StrategyInsert = {
    name: "Baseline forecast + news",
    type: "baseline",
    params_json: { version: "v1", description: "Baseline directional model with news context" },
    status: "active",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  const { data: created, error: insertError } = await supabaseAny
    .from("strategies")
    .insert([toInsert] as StrategyInsert[])
    .select("*")
    .maybeSingle();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "Failed to create baseline strategy");
  }

  return created as StrategyRow;
}

export async function generateSignalsForAsset(
  supabase: SupabaseDbClient,
  options: GenerateSignalsOptions
): Promise<GenerateSignalsResult> {
  const {
    assetId,
    assetSymbol,
    maxSignals = 1,
    validForMinutes = 60,
    lookbackMinutes = 120,
    validFromOffsetMinutes,
    validToOffsetMinutes,
  } = options;

  const strategy = await ensureBaselineStrategy(supabase);

  // 1) Bazowy forecast kierunku z modułu forecast.
  const baseline = await getBaselineForecastForXauusd();

  // 2) Kontekst newsów dla danego assetu (XAUUSD).
  const newsEvents = await getNewsEventsForAsset(assetSymbol);

  // Prosta agregacja: policz "net impact" newsów (pos/neg) i weź top kilka tytułów.
  let newsNetImpact = 0;
  if (newsEvents.length > 0) {
    for (const ev of newsEvents) {
      const dir = ev.direction === "positive" ? 1 : ev.direction === "negative" ? -1 : 0;
      newsNetImpact += dir * ev.strength;
    }
  }

  const topNewsTitles = newsEvents.slice(0, 3).map((ev) => ev.title);

  // 3) Mapa baseline → sygnał BUY/SELL/HOLD.
  let type: SignalInsert["type"] = "HOLD";
  if (baseline?.decision === "UP") type = "BUY";
  else if (baseline?.decision === "DOWN") type = "SELL";

  let confidence = baseline?.confidence ?? 0;

  // Delikatnie modulujemy confidence na podstawie znaku newsNetImpact (pos/neg).
  if (newsNetImpact !== 0) {
    const sign = newsNetImpact > 0 ? 1 : -1;
    confidence += 5 * sign;
  }

  if (!Number.isFinite(confidence)) {
    confidence = 0;
  }

  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const now = new Date();
  const nowMs = now.getTime();

  let fromMs = nowMs;
  if (typeof validFromOffsetMinutes === "number" && Number.isFinite(validFromOffsetMinutes)) {
    fromMs = nowMs + Math.floor(validFromOffsetMinutes) * 60 * 1000;
  }

  let toMs = nowMs + validForMinutes * 60 * 1000;
  if (typeof validToOffsetMinutes === "number" && Number.isFinite(validToOffsetMinutes)) {
    toMs = nowMs + Math.floor(validToOffsetMinutes) * 60 * 1000;
  }

  // Upewnij się, że okno ważności ma sensowną długość (co najmniej 5 minut).
  if (toMs <= fromMs) {
    toMs = fromMs + 5 * 60 * 1000;
  }

  const effectiveHorizonMinutes = Math.max(1, Math.round((toMs - fromMs) / (60 * 1000)));

  const validFrom = new Date(fromMs).toISOString();
  const validTo = new Date(toMs).toISOString();

  const inserts: SignalInsert[] = [];

  // Na razie generujemy jeden sygnał na wywołanie. maxSignals zostanie
  // w pełni wykorzystane, kiedy dodamy wiele strategii / wariantów.
  const count = Math.max(1, Math.min(maxSignals, 1));
  const windowMs = Math.max(lookbackMinutes, 1) * 60 * 1000;

  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i * windowMs) / Math.max(count - 1, 1);
    const ts = new Date(now.getTime() - offset).toISOString();
    inserts.push({
      strategy_id: strategy.id,
      asset_id: assetId,
      ts,
      status: "candidate",
      forecast_price: null,
      valid_from: validFrom,
      valid_to: validTo,
      type,
      confidence,
      meta_json: {
        generated_by: "baseline-strategy-v1",
        baseline: baseline ?? null,
        news_sample: topNewsTitles,
        news_net_impact: newsNetImpact,
        note: "Signal generated by baseline forecast + news context. Not investment advice.",
        valid: {
          from: validFrom,
          to: validTo,
          horizon_minutes: effectiveHorizonMinutes,
          lookback_minutes: lookbackMinutes,
        },
      },
    });
  }

  // Zapisz sygnały w bazie używając klienta z kontekstu (z nagłówkiem Authorization admina).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny2 = supabase as any;
  const { data, error } = await supabaseAny2
    .from("signals")
    .insert(inserts as SignalInsert[])
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return {
    strategy,
    inserted: (data ?? []) as SignalRow[],
  };
}
