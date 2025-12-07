import React from "react";

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

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: BaselineForecast };

interface BaselineMetrics {
  windowDays: number;
  totalSamples: number;
  correct: number;
  accuracy: number; // 0–100
}

export function BaselineForecastCard() {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [metrics, setMetrics] = React.useState<BaselineMetrics | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/forecast/xauusd");
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Błąd ładowania prognozy (${res.status})`);
        }
        const json = (await res.json()) as { data?: BaselineForecast | null };
        if (!json.data) {
          throw new Error("Brak danych prognozy bazowej.");
        }
        if (!mounted) return;
        setState({ status: "ready", data: json.data });
      } catch (e) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : "Nie udało się pobrać prognozy bazowej.";
        setState({ status: "error", message });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/admin/forecast/baseline-metrics?windowDays=90");
        if (!res.ok) return;
        const json = (await res.json()) as BaselineMetrics;
        if (!mounted) return;
        setMetrics(json);
      } catch {
        // cicho ignorujemy – UI baseline prognozy działa dalej bez metryki
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Ładuję prostą prognozę bazową na podstawie danych historycznych…
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Nie udało się wczytać prognozy bazowej: {state.message}
      </section>
    );
  }

  const { data } = state;

  const decisionLabel =
    data.decision === "UP"
      ? "UP — oczekiwany wzrost"
      : data.decision === "DOWN"
        ? "DOWN — oczekiwany spadek"
        : "FLAT — brak wyraźnego kierunku";

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Forecast (bazowy) – dane historyczne
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Prosty model kierunkowy na świecach dziennych ({data.timeframe}, horyzont {data.horizon}).
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          <span className="block font-mono">
            as of: <span className="font-semibold">{data.asOf.replace("T", " ").replace("Z", " UTC")}</span>
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={[
            "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold",
            data.decision === "UP" && "bg-emerald-50 text-emerald-700 border border-emerald-300",
            data.decision === "DOWN" && "bg-rose-50 text-rose-700 border border-rose-300",
            data.decision === "FLAT" && "bg-slate-50 text-slate-700 border border-slate-300",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {decisionLabel}
        </span>

        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[11px] text-slate-600">
          <span className="font-medium">Confidence:</span>
          <span className="font-mono">{data.confidence}%</span>
        </span>
      </div>

      {metrics && metrics.totalSamples > 0 ? (
        <p className="mt-1 text-[10px] text-slate-500">
          Trafność kierunku (ostatnie {metrics.windowDays} dni):{" "}
          <span className="font-mono font-semibold">{metrics.accuracy}%</span>{" "}
          <span className="text-slate-400">
            ({metrics.correct}/{metrics.totalSamples})
          </span>
        </p>
      ) : null}

      <p className="mt-2 text-[11px] leading-snug text-slate-700">{data.reason}</p>
    </section>
  );
}
