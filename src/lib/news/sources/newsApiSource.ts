import type { AssetEvent } from "../newsTypes";
import type { NewsSource } from "../newsSource";

interface NewsApiArticle {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  source?: {
    name?: string | null;
  } | null;
}

interface NewsApiResponse {
  // Shape is intentionally loose – we only care about `articles`.
  articles?: NewsApiArticle[] | null;
}

interface NewsApiSourceOptions {
  baseUrl: string;
  apiKey: string;
  defaultQuery: string;
  language?: string;
  pageSize?: number;
}

const MAX_SUMMARY_LENGTH = 300;

export class NewsApiSource implements NewsSource {
  public readonly id: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultQuery: string;
  private readonly language: string;
  private readonly pageSize: number;

  constructor(id: string, options: NewsApiSourceOptions) {
    this.id = id;
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.defaultQuery = options.defaultQuery;
    this.language = options.language ?? "en";
    this.pageSize = options.pageSize ?? 30;
  }

  async fetchEventsForAsset(asset: string): Promise<AssetEvent[]> {
    if (!asset) {
      return [];
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("q", this.defaultQuery || asset);
    url.searchParams.set("language", this.language);
    url.searchParams.set("pageSize", String(this.pageSize));

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error("NewsApiSource: non-OK response", res.status);
        return [];
      }

      const json = (await res.json()) as NewsApiResponse;
      const articles = json.articles ?? [];

      const events: AssetEvent[] = [];

      for (const raw of articles) {
        const title = (raw.title ?? "").trim();
        const urlStr = (raw.url ?? "").trim();
        const desc = (raw.description ?? "").trim();
        const published = (raw.publishedAt ?? "").trim();
        const sourceName = (raw.source?.name ?? "").trim() || this.id;

        if (!title || !urlStr || !published) {
          continue;
        }

        const summary =
          desc.length > 0 ? (desc.length > MAX_SUMMARY_LENGTH ? `${desc.slice(0, MAX_SUMMARY_LENGTH)}…` : desc) : title;

        const publishedAt = new Date(published).toISOString();

        events.push({
          id: `${this.id}-${Buffer.from(urlStr).toString("base64")}`,
          asset,
          title,
          summary,
          publishedAt,
          sourceName,
          sourceUrl: urlStr,
          // Direction / scores will be filled by scoring service later.
          direction: "NEU",
          impactScore: 5,
          sourceScore: 0.5,
          finalScore: 0,
          predictionDirection: null,
          observedDirection: null,
          sourceReliabilityScore: null,
        });
      }

      return events;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("NewsApiSource: failed to fetch or parse", error);
      return [];
    }
  }
}
