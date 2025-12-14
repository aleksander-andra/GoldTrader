import React from "react";
import { getSupabaseBrowser } from "../lib/auth/browserClient";
import type { Database } from "../db/database.types";
import { XauusdChartClient } from "./XauusdChartClient";
import { BaselineForecastCard } from "./forecast/BaselineForecastCard";
import { ForecastHistoryChart } from "./forecast/ForecastHistoryChart";

type SignalRow = Database["public"]["Tables"]["signals"]["Row"];
type SignalWithStrategy = SignalRow & {
  strategies?: { name?: string | null } | null;
};

interface PricePoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

type State =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      signals: SignalWithStrategy[];
      prices: PricePoint[];
      forecast: PricePoint[];
      unit: string;
      latestPrice: number;
    };

export function SignalsDashboardClient() {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [currency, setCurrency] = React.useState<"USD" | "EUR" | "PLN">("USD");
  const [unitDisplay, setUnitDisplay] = React.useState<string>("toz");

  // Update unitDisplay when state.unit changes (only when status is ready)
  React.useEffect(() => {
    if (state.status === "ready" && state.unit) {
      setUnitDisplay(state.unit);
    }
  }, [state.status, state.unit]);

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState({ status: "error", message: "Brak konfiguracji Supabase w przeglądarce." });
      return;
    }

    (async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        setState({ status: "anon" });
        return;
      }

      const { data: assetRow, error: assetError } = (await supabase
        .from("assets")
        .select("id")
        .eq("symbol", "XAUUSD")
        .maybeSingle()) as unknown as {
        data: { id: string } | null;
        error: { message: string } | null;
      };

      if (assetError) {
        setState({ status: "error", message: assetError.message });
        return;
      }

      if (!assetRow) {
        setState({ status: "error", message: "Aktywo XAUUSD nie istnieje w bazie." });
        return;
      }
      const assetId = assetRow.id;

      const nowIso = new Date().toISOString();

      const { data: signalsRaw, error: signalsError } = (await supabase
        .from("signals")
        .select("id, ts, type, confidence, asset_id, strategy_id, valid_from, valid_to, status, strategies(name)")
        .eq("asset_id", assetId)
        .eq("status", "accepted")
        .gt("valid_to", nowIso)
        .order("valid_from", { ascending: true })
        .limit(20)) as unknown as {
        data: SignalWithStrategy[] | null;
        error: { message: string } | null;
      };

      const signals = signalsRaw ?? null;

      if (signalsError) {
        setState({ status: "error", message: signalsError.message });
        return;
      }

      // 3) Pobierz dane cenowe z /api/prices
      let prices: PricePoint[] = [];
      let unit = "toz";
      let latestPrice = 0;
      try {
        const res = await fetch("/api/prices?symbol=XAUUSD&range=1d");
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Błąd ładowania cen (${res.status})`);
        }
        const json = (await res.json()) as {
          candles?: PricePoint[];
          unit?: string;
          latest_price?: number;
        };
        prices = json.candles ?? [];
        unit = json.unit || "toz";
        latestPrice = json.latest_price || 0;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Nie udało się pobrać danych cenowych.";
        setState({ status: "error", message });
        return;
      }

      // 4) Prosta prognoza: ekstrapolacja trendu z dwóch ostatnich punktów
      const forecast: PricePoint[] = [];
      if (prices.length >= 2) {
        const last = prices[prices.length - 1];
        const prev = prices[prices.length - 2];
        const stepMs = last.t - prev.t || 60 * 60 * 1000;
        const slope = last.c - prev.c;
        const stepsForecast = 12;
        for (let i = 1; i <= stepsForecast; i += 1) {
          const t = last.t + i * stepMs;
          const c = last.c + slope * i;
          forecast.push({
            t,
            o: c,
            h: c,
            l: c,
            c,
          });
        }
      }

      setState({
        status: "ready",
        signals: (signals as SignalWithStrategy[]) ?? [],
        prices,
        forecast,
        unit,
        latestPrice,
      });
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : "Unknown error";
      setState({ status: "error", message });
    });
  }, []);

  if (state.status === "loading") {
    return (
      <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-600">Ładuję sygnały…</p>
      </section>
    );
  }

  if (state.status === "anon") {
    return (
      <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Zaloguj się, aby zobaczyć sygnały dla XAUUSD. Użyj przycisku „Logowanie” w górnej nawigacji.
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="mt-6 bg-white border border-rose-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-rose-700">Nie udało się wczytać sygnałów: {state.message}</p>
      </section>
    );
  }

  const { signals, prices, forecast, unit, latestPrice } = state;

  // Exchange rates (simplified - in production, fetch from API)
  const exchangeRates = {
    USD: 1,
    EUR: 0.92,
    PLN: 4.0,
  };

  const lastCandle = prices[prices.length - 1] ?? null;
  const basePrice = lastCandle?.c ?? latestPrice;
  const lastTs = lastCandle ? new Date(lastCandle.t) : new Date();

  const formatIsoUtc = (d: Date | null) => (d ? d.toISOString().replace("T", " ").replace("Z", " UTC") : "");

  // Convert price based on currency and unit
  // For gold: toz (troy ounce) = 31.1035g, standard oz = 28.3495g
  // In trading, gold is typically quoted per troy ounce (toz)
  let convertedPrice = basePrice * exchangeRates[currency];
  let unitLabel = unit;

  if (unit === "toz") {
    if (unitDisplay === "g") {
      // Convert from price per toz to price per gram
      convertedPrice = (basePrice / 31.1035) * exchangeRates[currency];
      unitLabel = "g";
    } else {
      // Keep as toz (display as oz for clarity)
      unitLabel = "oz";
    }
  } else {
    // For other units (lb, mt), keep as is
    unitLabel = unit;
  }

  // Convert prices for chart based on selected currency and unit
  // Only convert if currency is not USD or unit is changed
  const convertPriceForChart = (price: number): number => {
    let converted = price;

    // Convert currency if not USD
    if (currency !== "USD") {
      converted = price * exchangeRates[currency];
    }

    // Convert unit if changed (only for gold/toz)
    if (unit === "toz" && unitDisplay === "g") {
      converted = converted / 31.1035;
    }

    return converted;
  };

  // Only convert if currency is not USD or unit is changed
  const needsConversion = currency !== "USD" || (unit === "toz" && unitDisplay === "g");

  const convertedPrices = needsConversion
    ? prices.map((p) => ({
        t: p.t,
        c: convertPriceForChart(p.c),
        o: convertPriceForChart(p.o),
        h: convertPriceForChart(p.h),
        l: convertPriceForChart(p.l),
      }))
    : prices;

  const convertedForecast = needsConversion
    ? forecast.map((p) => ({
        t: p.t,
        c: convertPriceForChart(p.c),
        o: convertPriceForChart(p.o),
        h: convertPriceForChart(p.h),
        l: convertPriceForChart(p.l),
      }))
    : forecast;

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-900">XAUUSD — wykres cenowy</h2>
          <div className="flex items-center gap-2">
            {basePrice > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "EUR" | "PLN")}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  title="Wybierz walutę"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="PLN">PLN</option>
                </select>
                {unit === "toz" && (
                  <select
                    value={unitDisplay}
                    onChange={(e) => setUnitDisplay(e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    title="Wybierz jednostkę"
                  >
                    <option value="toz">oz</option>
                    <option value="g">g</option>
                  </select>
                )}
                <p className="text-xs text-slate-600 font-mono">
                  <span className="font-semibold text-slate-900">
                    {convertedPrice.toFixed(2)} {currency}/{unitLabel}
                  </span>
                  <span className="text-slate-400 ml-1">({formatIsoUtc(lastTs)})</span>
                </p>
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
          Wykres XAUUSD na podstawie danych z Metals.dev API.
        </p>
        <div className="relative h-56 w-full rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
          {prices.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Ładowanie danych cenowych...
            </div>
          ) : (
            <XauusdChartClient
              prices={convertedPrices.map((p) => ({ t: p.t, c: p.c }))}
              forecast={convertedForecast.map((p) => ({ t: p.t, c: p.c }))}
            />
          )}
        </div>
      </div>
      <BaselineForecastCard />
      <ForecastHistoryChart />
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-semibold text-slate-900">Ostatnie sygnały XAUUSD</h2>
        <p className="text-xs text-slate-500">
          Dane z silnika baseline • {signals.length > 0 ? `${signals.length} aktywnych sygnałów` : "brak sygnałów"}
        </p>
      </div>
      {signals.length === 0 ? (
        <p className="text-sm text-slate-600">
          Brak aktywnych sygnałów. Jako admin wygeneruj i zaakceptuj nowe sygnały w panelu <code>/admin/signals</code>.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-semibold">Ważny (UTC)</th>
                <th className="py-2 pr-4 font-semibold">Typ</th>
                <th className="py-2 pr-4 font-semibold text-right">Pewność</th>
                <th className="py-2 pr-4 font-semibold">Strategia</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => {
                const strategyName = s.strategies?.name ?? s.strategy_id;
                const from = s.valid_from ? new Date(s.valid_from) : new Date(s.ts);
                const to = s.valid_to ? new Date(s.valid_to) : null;
                return (
                  <tr key={s.id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/80">
                    <td className="py-2 pr-4 font-mono text-xs text-slate-700 align-top">
                      <div>{from.toISOString().replace("T", " ").replace("Z", " UTC")}</div>
                      {to && (
                        <div className="text-[10px] text-slate-400">do {to.toISOString().substring(11, 16)} UTC</div>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                          s.type === "BUY" && "bg-emerald-50 text-emerald-700 border border-emerald-300",
                          s.type === "SELL" && "bg-rose-50 text-rose-700 border border-rose-300",
                          s.type === "HOLD" && "bg-slate-50 text-slate-700 border border-slate-300",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {s.type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-800">{s.confidence}%</td>
                    <td className="py-2 pr-4 text-xs font-mono text-slate-600">{strategyName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
