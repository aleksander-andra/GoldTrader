import React from "react";
import type { RecommendationResult } from "../../lib/news/newsTypes";

type BaselineDirection = "UP" | "DOWN" | "FLAT";

interface BaselineForecast {
  asset: string;
  timeframe: "1d";
  horizon: "1d";
  decision: BaselineDirection;
  confidence: number;
  asOf: string;
  reason: string;
}

type Status = "idle" | "loading" | "ready" | "error";

interface State {
  status: Status;
  ai: RecommendationResult | null;
  baseline: BaselineForecast | null;
  error: string | null;
}

const decisionLabelMap: Record<BaselineDirection | RecommendationResult["decision"], string> = {
  BUY: "BUY — AI (news)",
  SELL: "SELL — AI (news)",
  HOLD: "HOLD — AI (news)",
  UP: "UP — baseline (price history)",
  DOWN: "DOWN — baseline (price history)",
  FLAT: "FLAT — baseline (price history)",
};

const aiColors: Record<RecommendationResult["decision"], string> = {
  BUY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  SELL: "bg-rose-100 text-rose-800 border-rose-300",
  HOLD: "bg-slate-100 text-slate-800 border-slate-300",
};

const baselineColors: Record<BaselineDirection, string> = {
  UP: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DOWN: "bg-rose-50 text-rose-700 border-rose-200",
  FLAT: "bg-slate-50 text-slate-700 border-slate-200",
};

export function ForecastComparisonCard() {
  const [state, setState] = React.useState<State>({
    status: "idle",
    ai: null,
    baseline: null,
    error: null,
  });

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setState((prev) => ({ ...prev, status: "loading", error: null }));
      try {
        const [aiRes, baselineRes] = await Promise.all([
          fetch("/api/news/recommendation?assetId=XAUUSD"),
          fetch("/api/forecast/xauusd"),
        ]);

        if (!aiRes.ok) {
          const body = (await aiRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `AI recommendation failed (${aiRes.status})`);
        }
        if (!baselineRes.ok) {
          const body = (await baselineRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Baseline forecast failed (${baselineRes.status})`);
        }

        const aiJson = (await aiRes.json()) as { data?: RecommendationResult | null };
        const baselineJson = (await baselineRes.json()) as { data?: BaselineForecast | null };

        if (cancelled) return;

        if (!aiJson.data || !baselineJson.data) {
          setState({
            status: "error",
            ai: aiJson.data ?? null,
            baseline: baselineJson.data ?? null,
            error: "Brak pełnych danych do porównania prognoz.",
          });
          return;
        }

        setState({
          status: "ready",
          ai: aiJson.data,
          baseline: baselineJson.data,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "error",
          ai: null,
          baseline: null,
          error: error instanceof Error ? error.message : "Nie udało się pobrać danych do porównania.",
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading" || state.status === "idle") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Porównanie: AI (news) vs baseline (history)
        </p>
        <p className="mt-2">Ładuję dane z obu modeli…</p>
      </section>
    );
  }

  if (state.status === "error" || !state.ai || !state.baseline) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
          Porównanie prognoz niedostępne
        </p>
        <p className="mt-2">{state.error || "Brak danych do porównania prognoz."}</p>
      </section>
    );
  }

  const ai = state.ai;
  const baseline = state.baseline;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Porównanie: AI (news) vs baseline (history)
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Asset: XAUUSD, horyzont krótki (1–5 dni / 1d).</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 text-[11px] md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">AI (news)</p>
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border",
              aiColors[ai.decision],
            ].join(" ")}
          >
            {decisionLabelMap[ai.decision]}
          </span>
          <p className="mt-1">
            Confidence: <span className="font-mono font-semibold">{ai.confidence}%</span>
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Baseline (history)</p>
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border",
              baselineColors[baseline.decision],
            ].join(" ")}
          >
            {decisionLabelMap[baseline.decision]}
          </span>
          <p className="mt-1">
            Confidence: <span className="font-mono font-semibold">{baseline.confidence}%</span>
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-slate-600">
        <p className="font-semibold text-slate-700">Komentarz AI (news):</p>
        <p className="leading-snug">{ai.reason}</p>
      </div>
    </section>
  );
}
