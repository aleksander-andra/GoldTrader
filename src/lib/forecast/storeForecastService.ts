import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../db/database.types";
import type { BaselineForecast } from "./baselineModel";

type PriceHistoryRow = Database["public"]["Tables"]["price_history"]["Row"];
type ModelRunInsert = Database["public"]["Tables"]["model_runs"]["Insert"];
type PriceForecastInsert = Database["public"]["Tables"]["price_forecasts"]["Insert"];

const SERVICE_SUPABASE_URL =
  (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
const SERVICE_SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceRoleClient() {
  if (!SERVICE_SUPABASE_URL || !SERVICE_SUPABASE_SERVICE_KEY) {
    throw new Error("[forecast] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for storeForecastService");
  }

  return createClient<Database>(SERVICE_SUPABASE_URL, SERVICE_SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getTrainingWindow(rows: PriceHistoryRow[]): { start: string; end: string } | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  return { start: sorted[0]?.ts, end: sorted[sorted.length - 1]?.ts };
}

export async function storeBaselineForecast(
  forecast: BaselineForecast
): Promise<{ modelRunId: string | null; forecastId: string | null }> {
  const client = getServiceRoleClient();

  // 1) Wczytaj okno treningowe z price_history (np. ostatnie 200 świec dziennych).
  const { data: historyRows, error: historyError } = await client
    .from("price_history")
    .select("*")
    .eq("asset", forecast.asset)
    .eq("timeframe", forecast.timeframe)
    .order("ts", { ascending: true })
    .limit(200);

  if (historyError) {
    // eslint-disable-next-line no-console
    console.error("[forecast] Failed to load price_history for storeBaselineForecast", historyError);
    return { modelRunId: null, forecastId: null };
  }

  const window = getTrainingWindow(historyRows ?? []);
  const trainStart = window?.start ?? forecast.asOf;
  const trainEnd = window?.end ?? forecast.asOf;

  const modelType = "baseline_directional";
  const modelVersion = "v1";
  const params: Json = {
    description: "Simple directional baseline on daily candles with SMA(5)/SMA(20) and recent label majority.",
    horizon: forecast.horizon,
  };

  const modelRun: ModelRunInsert = {
    model_type: modelType,
    model_version: modelVersion,
    asset: forecast.asset,
    timeframe: forecast.timeframe,
    train_start: trainStart,
    train_end: trainEnd,
    val_metric_name: "n/a",
    val_metric_value: 0,
    params,
  };

  const { data: modelRunData, error: modelRunError } = await client
    .from("model_runs")
    .insert(modelRun)
    .select("id")
    .maybeSingle();

  if (modelRunError) {
    // eslint-disable-next-line no-console
    console.error("[forecast] Failed to insert model_runs for baseline forecast", modelRunError);
  }

  const modelRunId = modelRunData?.id ?? null;

  // 2) Zapisz prognozę do price_forecasts (używamy confidence jako prediction_value 0–1).
  const validFrom = forecast.asOf;
  const validTo = new Date(new Date(forecast.asOf).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const priceForecast: PriceForecastInsert = {
    asset: forecast.asset,
    timeframe: forecast.timeframe,
    forecast_horizon: forecast.horizon,
    target_type: "direction",
    prediction_value: forecast.confidence / 100,
    prediction_direction: forecast.decision,
    model_type: modelType,
    model_version: modelVersion,
    valid_from: validFrom,
    valid_to: validTo,
  };

  const { data: forecastData, error: forecastError } = await client
    .from("price_forecasts")
    .insert(priceForecast)
    .select("id")
    .maybeSingle();

  if (forecastError) {
    // eslint-disable-next-line no-console
    console.error("[forecast] Failed to insert price_forecasts for baseline forecast", forecastError);
  }

  const forecastId = forecastData?.id ?? null;

  return { modelRunId, forecastId };
}
