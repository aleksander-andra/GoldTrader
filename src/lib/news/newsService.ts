import type { NewsEventImpact } from "./newsTypes";
import type { NewsProvider } from "./newsProvider";
import { MockNewsProvider } from "./mockNewsProvider";

interface CachedEvents {
  events: NewsEventImpact[];
  fetchedAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const ENV_TTL_MS = Number(import.meta.env.NEWS_EVENTS_CACHE_TTL_MS) || DEFAULT_TTL_MS;

const cache = new Map<string, CachedEvents>();
let provider: NewsProvider | null = null;

function getProvider(): NewsProvider {
  if (provider) {
    return provider;
  }

  // TODO: in the future, swap to real providers based on configuration.
  provider = new MockNewsProvider();
  return provider;
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
