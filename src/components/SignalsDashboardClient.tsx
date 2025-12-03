import React from "react";
import { getSupabaseBrowser } from "../lib/auth/browserClient";
import type { Database } from "../db/database.types";
import { XauusdChartClient } from "./XauusdChartClient";

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
  | { status: "ready"; signals: SignalWithStrategy[]; prices: PricePoint[] };

export function SignalsDashboardClient() {
  const [state, setState] = React.useState<State>({ status: "loading" });

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

      const { data: signalsRaw, error: signalsError } = (await supabase
        .from("signals")
        .select("id, ts, type, confidence, asset_id, strategy_id, strategies(name)")
        .eq("asset_id", assetId)
        .order("ts", { ascending: false })
        .limit(20)) as unknown as {
        data: SignalWithStrategy[] | null;
        error: { message: string } | null;
      };

      const signals = signalsRaw ?? null;

      if (signalsError) {
        setState({ status: "error", message: signalsError.message });
        return;
      }

      // 3) Pobierz mockowane dane cenowe z /api/prices
      let prices: PricePoint[] = [];
      try {
        const res = await fetch("/api/prices?symbol=XAUUSD&range=1d");
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Błąd ładowania cen (${res.status})`);
        }
        const json = (await res.json()) as { candles?: PricePoint[] };
        prices = json.candles ?? [];
      } catch (e) {
        const message = e instanceof Error ? e.message : "Nie udało się pobrać danych cenowych.";
        setState({ status: "error", message });
        return;
      }

      setState({
        status: "ready",
        signals: (signals as SignalWithStrategy[]) ?? [],
        prices,
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

  const { signals, prices } = state;

  const lastCandle = prices[prices.length - 1] ?? null;
  const lastPrice = lastCandle?.c ?? null;
  const lastTs = lastCandle ? new Date(lastCandle.t) : null;

  const formatIsoUtc = (d: Date | null) => (d ? d.toISOString().replace("T", " ").replace("Z", " UTC") : "");

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-900">XAUUSD — podgląd wykresu</h2>
          {lastPrice !== null && (
            <p className="text-xs text-slate-600 font-mono">
              Ostatnia cena: <span className="font-semibold text-slate-900">{lastPrice.toFixed(2)} USD/toz</span>{" "}
              <span className="text-slate-400">({formatIsoUtc(lastTs)})</span>
            </p>
          )}
        </div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
          {/* Wersja uproszczona: w opisie zaznaczamy, że wykres jest mockowany na bazie bieżącej ceny */}
          Realna cena z Metals.dev (jeśli skonfigurowano METALS_API_KEY) + gładki, deterministyczny przebieg
        </p>
        <div className="relative h-56 w-full rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
          {prices.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Brak danych cenowych (mock)
            </div>
          ) : (
            <XauusdChartClient prices={prices} />
          )}
        </div>
      </div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-semibold text-slate-900">Ostatnie sygnały XAUUSD (mock)</h2>
        <p className="text-xs text-slate-500">
          Dane demonstracyjne • {signals.length > 0 ? `${signals.length} ostatnich sygnałów` : "brak sygnałów"}
        </p>
      </div>
      {signals.length === 0 ? (
        <p className="text-sm text-slate-600">
          Brak sygnałów. Jako admin wywołaj endpoint <code>/api/admin/generate-signals</code>, aby wygenerować dane
          mock.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-semibold">Czas (UTC)</th>
                <th className="py-2 pr-4 font-semibold">Typ</th>
                <th className="py-2 pr-4 font-semibold text-right">Pewność</th>
                <th className="py-2 pr-4 font-semibold">Strategia</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => {
                const strategyName = s.strategies?.name ?? s.strategy_id;
                return (
                  <tr key={s.id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/80">
                    <td className="py-2 pr-4 font-mono text-xs text-slate-700">{new Date(s.ts).toISOString()}</td>
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
                    <td className="py-2 pr-4 text-slate-800">{s.confidence}%</td>
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
