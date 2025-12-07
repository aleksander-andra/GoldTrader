import { type TimeSeriesDailyResponse } from "./types";

const AV_BASE_URL =
  (typeof process !== "undefined" && process.env.ALPHAVANTAGE_BASE_URL) ||
  import.meta.env.ALPHAVANTAGE_BASE_URL ||
  "https://www.alphavantage.co/query";

const AV_API_KEY =
  (typeof process !== "undefined" && process.env.ALPHAVANTAGE_API_KEY) || import.meta.env.ALPHAVANTAGE_API_KEY;

if (!AV_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn("[forecast] Missing ALPHAVANTAGE_API_KEY env – price history sync will be disabled until configured.");
}

export async function fetchDailyOhlcForAsset(symbol: string): Promise<TimeSeriesDailyResponse | null> {
  if (!AV_API_KEY) return null;

  const url = new URL(AV_BASE_URL);
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", AV_API_KEY);

  try {
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error("[forecast] Alpha Vantage TIME_SERIES_DAILY non-OK", res.status);
      return null;
    }
    const json = (await res.json()) as TimeSeriesDailyResponse;
    if (!json || !json["Time Series (Daily)"]) {
      return null;
    }
    return json;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] Alpha Vantage TIME_SERIES_DAILY failed", error);
    return null;
  }
}
