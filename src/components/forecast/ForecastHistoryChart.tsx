import React from "react";

type Direction = "UP" | "DOWN" | "FLAT" | "BUY" | "SELL" | "HOLD";

interface ForecastHistoryItem {
  asset: string;
  timeframe: string;
  forecast_horizon: string;
  target_type: string;
  prediction_value: number;
  prediction_direction: Direction;
  model_type: string;
  model_version: string;
  valid_from: string;
  valid_to: string;
  created_at: string;
}

interface HistoryResponse {
  asset: string;
  timeframe: string;
  count: number;
  items: ForecastHistoryItem[];
}

export function ForecastHistoryChart() {
  const [data, setData] = React.useState<HistoryResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/forecast/history?asset=XAUUSD&timeframe=1d&limit=30");
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Błąd ładowania historii forecastów (${res.status})`);
        }

        const json = (await res.json()) as HistoryResponse;
        if (cancelled) return;

        const items = json.items ?? [];
        /*
        // Fallback: jeśli brak danych, generujemy 7 mocków
        if (!items.length) {
          const now = Date.now();
          items = Array.from({ length: 7 }).map((_, idx) => {
            const t = new Date(now - (6 - idx) * 24 * 60 * 60 * 1000).toISOString();
            const v = 0.4 + 0.1 * Math.sin(idx);

            return {
              asset: "XAUUSD",
              timeframe: "1d",
              forecast_horizon: "1d",
              target_type: "direction",
              prediction_value: v,
              prediction_direction: "UP" as Direction,
              model_type: "baseline_mock",
              model_version: "v0",
              valid_from: t,
              valid_to: t,
              created_at: t,
            };
          });
        }
*/
        setData({
          asset: json.asset,
          timeframe: json.timeframe,
          count: items.length,
          items,
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Nie udało się pobrać historii forecastów.");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data && !error) {
    return (
      <section className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Ładuję historię prognoz bazowych…
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Nie udało się wczytać historii prognoz: {error}
      </section>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <section className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Brak zapisanych prognoz w tabeli <code>price_forecasts</code>.
      </section>
    );
  }

  const items = data.items;
  const width = 480;
  const height = 120;
  const paddingX = 20;
  const paddingY = 15;

  const points = items.map((item, index) => {
    const x =
      items.length <= 1 ? width / 2 : paddingX + ((width - 2 * paddingX) * index) / Math.max(1, items.length - 1);
    const clamped = Math.max(0, Math.min(1, item.prediction_value));
    const y = paddingY + (1 - clamped) * (height - 2 * paddingY);
    return { x, y, value: item.prediction_value, ts: item.created_at };
  });

  const pathD =
    points.length === 0
      ? ""
      : points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const last = items[items.length - 1];
  const first = items[0];

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Historia forecastów (baseline)
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Ostatnie {items.length} prognoz (prediction_value ≈ confidence/100).
          </p>
        </div>
        {last ? (
          <p className="text-[11px] font-mono text-slate-600">ostatni: {(last.prediction_value * 100).toFixed(0)}%</p>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <div className="h-40 w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
            <rect x={0} y={0} width={width} height={height} fill="#f8fafc" />
            <line
              x1={paddingX}
              y1={height - paddingY}
              x2={width - paddingX}
              y2={height - paddingY}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
            <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="#e2e8f0" strokeWidth={0.5} />
            {pathD ? <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={1.5} /> : null}
            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r={2} fill="#0f766e" />
            ))}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>czas (created_at)</span>
          <span>confidence (0–100%)</span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          {first ? (
            <span>
              {new Date(first.created_at).toLocaleDateString("pl-PL", {
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
          ) : (
            <span />
          )}
          {last ? (
            <span>
              {new Date(last.created_at).toLocaleDateString("pl-PL", {
                month: "2-digit",
                day: "2-digit",
              })}
            </span>
          ) : (
            <span />
          )}
        </div>
      </div>
    </section>
  );
}
