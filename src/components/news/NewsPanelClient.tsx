import React from "react";
import type { RecommendationResult, NewsEventImpact } from "../../lib/news/newsTypes";
import { RecommendationCard } from "./RecommendationCard";
import { NewsEventsList } from "./NewsEventsList";
import { ForecastComparisonCard } from "../forecast/ForecastComparisonCard";

type RecommendationState =
  | { status: "idle" | "loading"; data: null; error: null }
  | { status: "success"; data: RecommendationResult; error: null }
  | { status: "error"; data: null; error: string };

type EventsState =
  | { status: "idle" | "loading"; items: NewsEventImpact[] }
  | { status: "success"; items: NewsEventImpact[] }
  | { status: "error"; items: NewsEventImpact[] };

const DEFAULT_ASSET_ID = "XAUUSD";

export function NewsPanelClient() {
  const [recommendation, setRecommendation] = React.useState<RecommendationState>({
    status: "idle",
    data: null,
    error: null,
  });
  const [events, setEvents] = React.useState<EventsState>({
    status: "idle",
    items: [],
  });

  React.useEffect(() => {
    let isCancelled = false;

    const fetchRecommendation = async () => {
      setRecommendation({ status: "loading", data: null, error: null });
      try {
        const res = await fetch(`/api/news/recommendation?assetId=${DEFAULT_ASSET_ID}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          const message = body?.error ?? `Request failed with status ${res.status}`;
          if (!isCancelled) {
            setRecommendation({ status: "error", data: null, error: message });
          }
          return;
        }
        const json = (await res.json()) as { data: RecommendationResult };
        if (!isCancelled) {
          setRecommendation({ status: "success", data: json.data, error: null });
        }
      } catch (error) {
        if (!isCancelled) {
          setRecommendation({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    };

    const fetchEvents = async () => {
      setEvents({ status: "loading", items: [] });
      try {
        const res = await fetch(`/api/news/events?assetId=${DEFAULT_ASSET_ID}`);
        if (!res.ok) {
          if (!isCancelled) {
            setEvents({ status: "error", items: [] });
          }
          return;
        }
        const json = (await res.json()) as { items: NewsEventImpact[] };
        if (!isCancelled) {
          setEvents({ status: "success", items: json.items ?? [] });
        }
      } catch {
        if (!isCancelled) {
          setEvents({ status: "error", items: [] });
        }
      }
    };

    void fetchRecommendation();
    void fetchEvents();

    return () => {
      isCancelled = true;
    };
  }, []);

  const isRecoLoading = recommendation.status === "loading" || recommendation.status === "idle";
  const recoError = recommendation.status === "error" ? recommendation.error : null;
  const recoData = recommendation.status === "success" ? recommendation.data : null;

  const isEventsLoading = events.status === "loading" || events.status === "idle";

  return (
    <aside className="space-y-4">
      <ForecastComparisonCard />
      <RecommendationCard recommendation={recoData} isLoading={isRecoLoading} error={recoError} />
      <NewsEventsList events={events.items} isLoading={isEventsLoading} />
    </aside>
  );
}
