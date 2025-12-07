import type { AssetEvent, AssetEventDirection } from "../newsTypes";
import type { NewsSource } from "../newsSource";

interface AlphaVantageTickerSentiment {
  ticker?: string;
  relevance_score?: string;
  ticker_sentiment_score?: string;
  ticker_sentiment_label?: string;
}

interface AlphaVantageFeedItem {
  title?: string;
  url?: string;
  time_published?: string;
  summary?: string;
  source?: string;
  source_domain?: string;
  overall_sentiment_score?: number;
  overall_sentiment_label?: string;
  ticker_sentiment?: AlphaVantageTickerSentiment[];
}

interface AlphaVantageNewsResponse {
  feed?: AlphaVantageFeedItem[];
}

const AV_NEWS_URL = "https://www.alphavantage.co/query";
const MAX_SUMMARY_LEN = 300;

function parseTimePublished(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/.exec(value);
  if (!m) return new Date().toISOString();
  const [, y, mo, d, h, mi, s = "00"] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
  return date.toISOString();
}

function labelToDirection(label: string | undefined): AssetEventDirection {
  const v = (label ?? "").toLowerCase();
  if (v.includes("bullish")) return "POS";
  if (v.includes("bearish")) return "NEG";
  return "NEU";
}

function computeImpactScore(score: number | undefined): number {
  const s = Number(score);
  if (!Number.isFinite(s)) return 5;
  const raw = Math.round(Math.abs(s) * 8) + 2; // 0 -> 2, 1 -> 10
  return Math.max(1, Math.min(10, raw));
}

function domainPrior(domain: string | undefined): number {
  const d = (domain ?? "").replace(/^www\./, "").toLowerCase();
  if (d === "reuters.com") return 0.9;
  if (d === "bloomberg.com") return 0.9;
  if (d === "wsj.com") return 0.85;
  return 0.5;
}

function freshnessFactor(publishedAt: string): number {
  const t = new Date(publishedAt).getTime();
  const now = Date.now();
  const diffH = (now - t) / (1000 * 60 * 60);
  if (!Number.isFinite(diffH) || diffH < 0) return 0.5;
  if (diffH <= 6) return 1;
  if (diffH <= 24) return 0.8;
  if (diffH <= 72) return 0.6;
  return 0.4;
}

export class AlphaVantageNewsSource implements NewsSource {
  public readonly id = "alpha-vantage-news";
  private readonly apiKey: string;
  private readonly limit: number;

  constructor(apiKey: string, limit = 50) {
    this.apiKey = apiKey;
    this.limit = limit;
  }

  async fetchEventsForAsset(asset: string): Promise<AssetEvent[]> {
    if (!asset) return [];

    const apiKey = this.apiKey || import.meta.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.error("AlphaVantageNewsSource: missing ALPHA_VANTAGE_API_KEY");
      return [];
    }

    // Dla XAUUSD używamy tickera XAU
    const url = new URL(AV_NEWS_URL);
    url.searchParams.set("function", "NEWS_SENTIMENT");
    url.searchParams.set("tickers", "XAU");
    url.searchParams.set("sort", "LATEST");
    url.searchParams.set("limit", String(this.limit));
    url.searchParams.set("apikey", apiKey);

    try {
      const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error("AlphaVantageNewsSource: non-OK response", res.status);
        return [];
      }

      const json = (await res.json()) as AlphaVantageNewsResponse;
      const feed = json.feed ?? [];
      const events: AssetEvent[] = [];

      for (const item of feed) {
        const title = (item.title ?? "").trim();
        const urlStr = (item.url ?? "").trim();
        const summaryRaw = (item.summary ?? "").trim();
        const sourceName = (item.source ?? "").trim() || "Unknown";
        const domain = item.source_domain ?? "";

        if (!title || !urlStr) continue;

        const publishedAt = parseTimePublished(item.time_published);
        const summary =
          summaryRaw.length > 0
            ? summaryRaw.length > MAX_SUMMARY_LEN
              ? `${summaryRaw.slice(0, MAX_SUMMARY_LEN)}…`
              : summaryRaw
            : title;

        const tickerSent =
          (item.ticker_sentiment ?? []).find((t) => (t.ticker ?? "").toUpperCase() === "XAU") ?? undefined;

        const scoreFromTicker = Number(tickerSent?.ticker_sentiment_score);
        const scoreFromOverall = Number(item.overall_sentiment_score);
        const sentimentScore = Number.isFinite(scoreFromTicker)
          ? scoreFromTicker
          : Number.isFinite(scoreFromOverall)
            ? scoreFromOverall
            : 0;

        const sentimentLabel = tickerSent?.ticker_sentiment_label ?? item.overall_sentiment_label ?? "Neutral";

        const direction = labelToDirection(sentimentLabel);
        const impactScore = computeImpactScore(sentimentScore);

        const rel = Number(tickerSent?.relevance_score);
        const relScore = Number.isFinite(rel) ? rel : 0.5;
        const prior = domainPrior(domain);
        const sourceScore = 0.5 * prior + 0.5 * relScore;

        const fresh = freshnessFactor(publishedAt);
        const finalRaw = impactScore * 6 + sourceScore * 30 + fresh * 10;
        const finalScore = Math.max(0, Math.min(100, finalRaw));

        events.push({
          id: `${this.id}-${Buffer.from(urlStr).toString("base64")}`,
          asset: "XAUUSD",
          title,
          summary,
          publishedAt,
          sourceName,
          sourceUrl: urlStr,
          direction,
          impactScore,
          sourceScore,
          finalScore,
          predictionDirection: null,
          observedDirection: null,
          sourceReliabilityScore: null,
        });
      }

      return events;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("AlphaVantageNewsSource: failed to fetch/parse", error);
      return [];
    }
  }
}
