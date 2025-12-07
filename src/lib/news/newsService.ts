import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { NewsEventImpact } from "./newsTypes";
import type { NewsProvider } from "./newsProvider";
import { MockNewsProvider } from "./mockNewsProvider";
import { getTopAssetEventsForAsset } from "./assetEventsRepository";

interface CachedEvents {
  events: NewsEventImpact[];
  fetchedAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const ENV_TTL_MS =
  Number(
    (typeof process !== "undefined" && process.env.NEWS_EVENTS_CACHE_TTL_MS) || import.meta.env.NEWS_EVENTS_CACHE_TTL_MS
  ) || DEFAULT_TTL_MS;
const UI_MAX_EVENTS =
  Number(
    (typeof process !== "undefined" && process.env.NEWS_MAX_EVENTS_FOR_UI) || import.meta.env.NEWS_MAX_EVENTS_FOR_UI
  ) || 6;
const MIN_FINAL_SCORE =
  Number(
    (typeof process !== "undefined" && process.env.NEWS_MIN_FINAL_SCORE) || import.meta.env.NEWS_MIN_FINAL_SCORE
  ) || 40;
const MAX_EVENT_AGE_DAYS =
  Number(
    (typeof process !== "undefined" && process.env.NEWS_MAX_EVENT_AGE_DAYS) || import.meta.env.NEWS_MAX_EVENT_AGE_DAYS
  ) || 7;

const cache = new Map<string, CachedEvents>();
let provider: NewsProvider | null = null;
let serviceClient: ReturnType<typeof createClient<Database>> | null = null;

function getProvider(): NewsProvider {
  if (provider) {
    return provider;
  }

  // TODO: in the future, swap to real providers based on configuration.
  provider = new MockNewsProvider();
  return provider;
}

function getServiceClient() {
  if (serviceClient) {
    return serviceClient;
  }

  const url = (typeof process !== "undefined" && process.env.SUPABASE_URL) || import.meta.env.SUPABASE_URL;
  const serviceKey =
    (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  serviceClient = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}

interface GetNewsEventsOptions {
  useCache?: boolean;
  ttlMs?: number;
}

export async function getNewsEventsForAsset(
  assetId: string,
  options: GetNewsEventsOptions = {}
): Promise<NewsEventImpact[]> {
  const { useCache = true, ttlMs = ENV_TTL_MS } = options;

  if (!assetId) {
    return [];
  }

  const cacheKey = assetId;

  if (useCache) {
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < ttlMs) {
      return cached.events;
    }
  }

  // First try: read from Supabase asset_events (if configured and table exists).
  const client = getServiceClient();
  if (client) {
    try {
      // Pobierz więcej niż UI potrzebuje, potem przefiltruj po score/świeżości.
      const rows = await getTopAssetEventsForAsset(client, assetId, { limit: 20 });

      if (rows.length > 0) {
        const now = Date.now();
        const maxAgeMs = MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000;

        const filtered = rows.filter((row) => {
          const score = Number(row.final_score);
          if (Number.isFinite(score) && score < MIN_FINAL_SCORE) {
            return false;
          }

          const ts = Date.parse(row.published_at);
          if (Number.isFinite(ts) && maxAgeMs > 0 && now - ts > maxAgeMs) {
            return false;
          }

          return true;
        });

        const top = filtered.slice(0, UI_MAX_EVENTS);

        const events: NewsEventImpact[] = top.map((row) => ({
          id: row.id,
          assetId: row.asset,
          title: row.title,
          description: row.summary,
          date: row.published_at,
          direction: row.direction === "POS" ? "positive" : row.direction === "NEG" ? "negative" : "neutral",
          strength: row.impact_score,
          source: row.source_name,
        }));

        if (useCache) {
          cache.set(cacheKey, { events, fetchedAt: Date.now() });
        }

        return events;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("newsService: failed to fetch from asset_events, falling back to provider", error);
    }
  }

  // Fallback: legacy mock provider (for dev / when ingest is not configured).
  const currentProvider = getProvider();
  const events = await currentProvider.getEvents(assetId);

  if (useCache) {
    cache.set(cacheKey, { events, fetchedAt: Date.now() });
  }

  return events;
}

// Small helper to aid testing and future configuration.
export function __setNewsProvider(customProvider: NewsProvider | null): void {
  provider = customProvider;
}
