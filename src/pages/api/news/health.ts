import { getLastOpenAiRecommendationUsage } from "../../../lib/ai/recommendationService";

export const prerender = false;

// GET /api/news/health
// Prosty health-check dla panelu newsów i rekomendacji AI.
export async function GET(): Promise<Response> {
  const openaiApiKey = import.meta.env.OPENAI_API_KEY;
  const openaiModel = import.meta.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxTokensRaw = import.meta.env.OPENAI_MAX_TOKENS_PER_CALL;
  const recommendationTtlRaw = import.meta.env.RECOMMENDATION_CACHE_TTL_MS;
  const newsTtlRaw = import.meta.env.NEWS_EVENTS_CACHE_TTL_MS;

  const maxTokens = Number(maxTokensRaw);
  const recommendationTtlMs = Number(recommendationTtlRaw);
  const newsEventsTtlMs = Number(newsTtlRaw);

  const body = {
    openaiConfigured: Boolean(openaiApiKey),
    openaiModel,
    openaiMaxTokensPerCall: Number.isFinite(maxTokens) ? maxTokens : 300,
    recommendationCacheTtlMs: Number.isFinite(recommendationTtlMs) ? recommendationTtlMs : 10 * 60 * 1000,
    newsEventsCacheTtlMs: Number.isFinite(newsEventsTtlMs) ? newsEventsTtlMs : 5 * 60 * 1000,
    lastOpenAiRecommendationUsage: getLastOpenAiRecommendationUsage(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
