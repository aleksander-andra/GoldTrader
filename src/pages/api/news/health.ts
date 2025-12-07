import { getLastOpenAiRecommendationUsage } from "../../../lib/ai/recommendationService";

export const prerender = false;

// GET /api/news/health
// Prosty health-check dla panelu newsów i rekomendacji AI.
export async function GET(): Promise<Response> {
  const openaiApiKey = (typeof process !== "undefined" && process.env.OPENAI_API_KEY) || import.meta.env.OPENAI_API_KEY;
  const openaiModel =
    (typeof process !== "undefined" && process.env.OPENAI_MODEL) || import.meta.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxTokensRaw =
    (typeof process !== "undefined" && process.env.OPENAI_MAX_TOKENS_PER_CALL) ||
    import.meta.env.OPENAI_MAX_TOKENS_PER_CALL;
  const recommendationTtlRaw =
    (typeof process !== "undefined" && process.env.RECOMMENDATION_CACHE_TTL_MS) ||
    import.meta.env.RECOMMENDATION_CACHE_TTL_MS;
  const newsTtlRaw =
    (typeof process !== "undefined" && process.env.NEWS_EVENTS_CACHE_TTL_MS) ||
    import.meta.env.NEWS_EVENTS_CACHE_TTL_MS;
  const cronSecretRaw =
    (typeof process !== "undefined" && process.env.NEWS_CRON_SECRET) || import.meta.env.NEWS_CRON_SECRET;

  const maxTokens = Number(maxTokensRaw);
  const recommendationTtlMs = Number(recommendationTtlRaw);
  const newsEventsTtlMs = Number(newsTtlRaw);

  const body = {
    openaiConfigured: Boolean(openaiApiKey),
    openaiModel,
    openaiMaxTokensPerCall: Number.isFinite(maxTokens) ? maxTokens : 300,
    recommendationCacheTtlMs: Number.isFinite(recommendationTtlMs) ? recommendationTtlMs : 10 * 60 * 1000,
    newsEventsCacheTtlMs: Number.isFinite(newsEventsTtlMs) ? newsEventsTtlMs : 5 * 60 * 1000,
    cronConfigured: typeof cronSecretRaw === "string" && cronSecretRaw.trim().length > 0,
    cronSecretLength:
      typeof cronSecretRaw === "string" && cronSecretRaw.trim().length > 0 ? cronSecretRaw.trim().length : 0,
    lastOpenAiRecommendationUsage: getLastOpenAiRecommendationUsage(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
