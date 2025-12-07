import type { NewsEventImpact } from "../../lib/news/newsTypes";

interface NewsEventsListProps {
  events: NewsEventImpact[];
  isLoading?: boolean;
}

function eventAccentClasses(direction: NewsEventImpact["direction"]): string {
  if (direction === "positive") return "border-emerald-200 bg-emerald-50";
  if (direction === "negative") return "border-rose-200 bg-rose-50";
  return "border-slate-200 bg-slate-50";
}

function directionLabel(direction: NewsEventImpact["direction"]): string {
  if (direction === "positive") return "Pozytywny wpływ";
  if (direction === "negative") return "Negatywny wpływ";
  return "Neutralny wpływ";
}

export function NewsEventsList({ events, isLoading }: NewsEventsListProps) {
  if (isLoading) {
    return (
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded bg-slate-200" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Wydarzenia wpływające na kurs
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Wydarzenia makroekonomiczne i geopolityczne dla XAUUSD z zewnętrznych źródeł newsów.
          </p>
        </div>
        {events.length > 0 ? <span className="text-[11px] text-slate-400">{events.length} wydarzenia</span> : null}
      </header>

      {events.length === 0 ? (
        <p className="text-sm text-slate-600">
          Brak zidentyfikowanych wydarzeń wpływających na kurs w ostatnich dniach.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const accent = eventAccentClasses(event.direction);
            const dateLabel = event.dateRange
              ? `${new Date(event.dateRange.from).toLocaleDateString("pl-PL")} – ${new Date(
                  event.dateRange.to
                ).toLocaleDateString("pl-PL")}`
              : new Date(event.date).toLocaleDateString("pl-PL");

            const strengthLabel = `${event.strength}/10`;

            return (
              <article key={event.id} className={`flex gap-3 rounded-lg border p-3 ${accent}`}>
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-slate-200 to-slate-300">
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                    {event.direction === "positive" ? "POS" : event.direction === "negative" ? "NEG" : "NEU"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{event.title}</h3>
                    <span className="whitespace-nowrap text-[11px] text-slate-500">{dateLabel}</span>
                  </div>
                  <p className="text-xs text-slate-700">{event.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full bg-white/60 px-2 py-0.5">{directionLabel(event.direction)}</span>
                    <span className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5">
                      <span className="font-medium">Siła:</span>
                      <span>{strengthLabel}</span>
                      <span className="relative h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-slate-500"
                          style={{
                            width: `${Math.max(0, Math.min(10, event.strength)) * 10}%`,
                          }}
                        />
                      </span>
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">{event.source}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
