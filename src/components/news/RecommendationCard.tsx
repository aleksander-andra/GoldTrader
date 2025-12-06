import type { RecommendationResult } from "../../lib/news/newsTypes";

interface RecommendationCardProps {
  recommendation: RecommendationResult | null;
  isLoading?: boolean;
  error?: string | null;
}

const decisionColors: Record<RecommendationResult["decision"], string> = {
  BUY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  SELL: "bg-rose-100 text-rose-800 border-rose-300",
  HOLD: "bg-slate-100 text-slate-800 border-slate-300",
};

export function RecommendationCard({ recommendation, isLoading, error }: RecommendationCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-slate-100" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-rose-700">Rekomendacja niedostępna</h2>
        <p className="mt-2">{error}</p>
      </section>
    );
  }

  if (!recommendation) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rekomendacja</h2>
        <p className="mt-2">Brak danych rekomendacyjnych dla wybranego aktywa.</p>
      </section>
    );
  }

  const colorClass = decisionColors[recommendation.decision];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI rekomendacja</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Asset: <span className="font-mono">{recommendation.assetId}</span>
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${colorClass}`}>
          {recommendation.decision}
        </div>
      </header>

      <p className="mt-3 text-sm text-slate-700">{recommendation.reason}</p>

      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex flex-1 items-center gap-2">
          <span className="whitespace-nowrap font-medium text-slate-600">Confidence: {recommendation.confidence}%</span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, recommendation.confidence))}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Ostatnia aktualizacja</p>
          <p className="text-[11px] text-slate-500">
            {new Date(recommendation.createdAt).toLocaleTimeString("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            Ważne do{" "}
            {new Date(recommendation.validUntil).toLocaleTimeString("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
