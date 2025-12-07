import type { AssetEvent } from "./newsTypes";
import type { NewsSource } from "./newsSource";
import { NewsApiSource } from "./sources/newsApiSource";
import { AlphaVantageNewsSource } from "./sources/alphaVantageNewsSource";

// Simple factory to build a list of enabled sources based on environment.
export function buildNewsSources(): NewsSource[] {
  const sources: NewsSource[] = [];

  const apiUrl = import.meta.env.NEWS_API_URL;
  const apiKey = import.meta.env.NEWS_API_KEY;
  const queryXauusd = import.meta.env.NEWS_API_QUERY_XAUUSD || "gold OR XAUUSD";
  const pageSizeRaw = import.meta.env.NEWS_MAX_EVENTS_PER_SOURCE;
  const pageSize = Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : 30;
  const alphaKey = import.meta.env.ALPHA_VANTAGE_API_KEY;
  const alphaLimitRaw = import.meta.env.ALPHA_VANTAGE_MAX_EVENTS_PER_SOURCE;
  const alphaLimit = Number.isFinite(Number(alphaLimitRaw)) ? Number(alphaLimitRaw) : 50;

  if (apiUrl && apiKey) {
    sources.push(
      new NewsApiSource("news-api", {
        baseUrl: apiUrl,
        apiKey,
        defaultQuery: queryXauusd,
        language: "en",
        pageSize,
      })
    );
  }

  if (alphaKey) {
    sources.push(new AlphaVantageNewsSource(alphaKey, alphaLimit));
  }

  return sources;
}

export async function fetchRawEventsFromAllSources(asset: string): Promise<AssetEvent[]> {
  const sources = buildNewsSources();

  if (!asset || sources.length === 0) {
    return [];
  }

  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        const events = await source.fetchEventsForAsset(asset);
        // eslint-disable-next-line no-console
        console.log(`NewsAggregator: source=${source.id} asset=${asset} events=${events.length}`);
        return events;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`NewsAggregator: source ${source.id} failed`, error);
        return [];
      }
    })
  );

  const all = results.flat();

  // Deduplicate by asset + sourceUrl
  const seen = new Set<string>();
  const deduped: AssetEvent[] = [];

  for (const ev of all) {
    const key = `${ev.asset}:${ev.sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ev);
  }

  return deduped;
}
