import type { RecommendationResult } from "../news/newsTypes";
import { getNewsEventsForAsset } from "../news/newsService";

interface CachedRecommendation {
  recommendation: RecommendationResult;
  fetchedAt: number;
}

interface LastOpenAiUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  at: string;
}

const DEFAULT_RECOMMENDATION_TTL_MS = 10 * 60 * 1000;
const ENV_RECOMMENDATION_TTL_MS = Number(import.meta.env.RECOMMENDATION_CACHE_TTL_MS) || DEFAULT_RECOMMENDATION_TTL_MS;

const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_MAX_TOKENS =
  Number(import.meta.env.OPENAI_MAX_TOKENS_PER_CALL) &&
  Number.isFinite(Number(import.meta.env.OPENAI_MAX_TOKENS_PER_CALL))
    ? Number(import.meta.env.OPENAI_MAX_TOKENS_PER_CALL)
    : 300;

const recommendationCache = new Map<string, CachedRecommendation>();
let lastOpenAiUsage: LastOpenAiUsage | null = null;

interface GetRecommendationOptions {
  useCache?: boolean;
  ttlMs?: number;
}

async function buildContextSummary(assetId: string): Promise<string> {
  const events = await getNewsEventsForAsset(assetId, { useCache: true });

  if (!events.length) {
    return "Brak istotnych wydarzeń makro / newsów w ostatnich dniach.";
  }

  const topEvents = events.slice(0, 3);

  const bullets = topEvents
    .map((e) => `- [${e.direction}, siła ${e.strength}/10] ${e.title} — ${e.description}`)
    .join("\n");

  return `Ostatnie wydarzenia dla aktywa ${assetId}:\n${bullets}`;
}

function buildMockRecommendation(assetId: string, ttlMs: number): RecommendationResult {
  const nowIso = new Date().toISOString();
  const validUntil = new Date(Date.now() + ttlMs).toISOString();

  return {
    assetId,
    decision: "HOLD",
    reason: "Mockowana rekomendacja: brak podłączonego silnika OpenAI, pokazujemy neutralne HOLD dla celów MVP.",
    confidence: 50,
    createdAt: nowIso,
    validUntil,
  };
}

export async function getRecommendationForAsset(
  assetId: string,
  options: GetRecommendationOptions = {}
): Promise<RecommendationResult | null> {
  const { useCache = true, ttlMs = ENV_RECOMMENDATION_TTL_MS } = options;

  if (!assetId) {
    return null;
  }

  const cacheKey = assetId;

  if (useCache) {
    const cached = recommendationCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < ttlMs) {
      return cached.recommendation;
    }
  }

  // Jeśli nie skonfigurowano OpenAI, zwracamy deterministycznego mocka,
  // żeby UI zawsze działał (również w dev / bez kluczy).
  if (!OPENAI_API_KEY) {
    const mock = buildMockRecommendation(assetId, ttlMs);

    if (useCache) {
      recommendationCache.set(cacheKey, { recommendation: mock, fetchedAt: Date.now() });
    }

    return mock;
  }

  try {
    const contextSummary = await buildContextSummary(assetId);

    const systemPrompt =
      "Jesteś asystentem generującym bardzo krótkie rekomendacje tradingowe dla instrumentów finansowych. " +
      "Twoim zadaniem jest na podstawie kontekstu zaproponować jedno z trzech działań: BUY, SELL lub HOLD. " +
      "Odpowiadasz TYLKO w formacie JSON, bez żadnych komentarzy ani objaśnień.";

    const userPrompt =
      `${contextSummary}\n\n` +
      "Na podstawie tych informacji wygeneruj rekomendację dla krótkoterminowego tradera.\n" +
      "Zwróć TYLKO poprawne JSON z polami:\n" +
      '{ "decision": "BUY|SELL|HOLD", "reason": "1-3 krótkie zdania po polsku", "confidence": 0-100 }';

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: OPENAI_MAX_TOKENS,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const mock = buildMockRecommendation(assetId, ttlMs);

      if (useCache) {
        recommendationCache.set(cacheKey, { recommendation: mock, fetchedAt: Date.now() });
      }

      return mock;
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    if (json.usage) {
      const nowIso = new Date().toISOString();
      lastOpenAiUsage = {
        model: OPENAI_MODEL,
        promptTokens: Number(json.usage.prompt_tokens) || 0,
        completionTokens: Number(json.usage.completion_tokens) || 0,
        totalTokens: Number(json.usage.total_tokens) || 0,
        at: nowIso,
      };
    }

    const content = json.choices?.[0]?.message?.content ?? "";

    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    const jsonSubstring =
      firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
        ? content.slice(firstBrace, lastBrace + 1)
        : content;

    interface OpenAiRecommendationJson {
      decision?: unknown;
      reason?: unknown;
      confidence?: unknown;
    }

    let parsed: OpenAiRecommendationJson;

    try {
      parsed = JSON.parse(jsonSubstring) as OpenAiRecommendationJson;
    } catch {
      const mock = buildMockRecommendation(assetId, ttlMs);

      if (useCache) {
        recommendationCache.set(cacheKey, { recommendation: mock, fetchedAt: Date.now() });
      }

      return mock;
    }

    const decisionRaw = typeof parsed.decision === "string" ? parsed.decision.toUpperCase() : "HOLD";

    const decision: RecommendationResult["decision"] =
      decisionRaw === "BUY" || decisionRaw === "SELL" || decisionRaw === "HOLD" ? decisionRaw : "HOLD";

    const reason =
      typeof parsed.reason === "string"
        ? parsed.reason.slice(0, 400)
        : "Brak szczegółowego uzasadnienia od modelu; domyślna rekomendacja.";

    const rawConfidence = Number(parsed.confidence);
    const confidence =
      Number.isFinite(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 100 ? rawConfidence : 50;

    const nowIso = new Date().toISOString();
    const validUntil = new Date(Date.now() + ttlMs).toISOString();

    const result: RecommendationResult = {
      assetId,
      decision,
      reason,
      confidence,
      createdAt: nowIso,
      validUntil,
    };

    if (useCache) {
      recommendationCache.set(cacheKey, { recommendation: result, fetchedAt: Date.now() });
    }

    return result;
  } catch {
    const mock = buildMockRecommendation(assetId, ttlMs);

    if (useCache) {
      recommendationCache.set(cacheKey, { recommendation: mock, fetchedAt: Date.now() });
    }

    return mock;
  }
}

export function getLastOpenAiRecommendationUsage(): LastOpenAiUsage | null {
  return lastOpenAiUsage;
}
