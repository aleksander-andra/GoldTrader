import type { AssetEvent, AssetEventDirection } from "./newsTypes";

const SOURCE_PRIORS: Record<string, number> = {
  "bloomberg.com": 0.9,
  "reuters.com": 0.9,
  "wsj.com": 0.85,
};

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function getSourcePrior(sourceUrl: string, fallbackName: string): number {
  const domain = extractDomain(sourceUrl);
  const key = domain || fallbackName.toLowerCase();
  return SOURCE_PRIORS[key] ?? 0.5;
}

function sentimentFromText(text: string): { direction: AssetEventDirection; score: number } {
  const lower = text.toLowerCase();

  const positiveKeywords = ["rally", "surge", "soars", "bull", "safe haven", "geopolitical tension"];
  const negativeKeywords = ["selloff", "slump", "plunge", "hawkish", "rate hike"];

  let score = 5;
  let direction: AssetEventDirection = "NEU";

  for (const kw of positiveKeywords) {
    if (lower.includes(kw)) {
      direction = "POS";
      score = 7;
      break;
    }
  }

  for (const kw of negativeKeywords) {
    if (lower.includes(kw)) {
      direction = "NEG";
      score = 7;
      break;
    }
  }

  return { direction, score };
}

function freshnessFactor(publishedAtIso: string): number {
  const published = new Date(publishedAtIso).getTime();
  const now = Date.now();
  const diffHours = (now - published) / (1000 * 60 * 60);

  if (!Number.isFinite(diffHours) || diffHours < 0) {
    return 0.5;
  }

  if (diffHours <= 6) return 1;
  if (diffHours <= 24) return 0.8;
  if (diffHours <= 72) return 0.6;
  return 0.4;
}

export function scoreAssetEvent(base: AssetEvent): AssetEvent {
  const prior = getSourcePrior(base.sourceUrl, base.sourceName);
  const { direction, score: sentimentScore } = sentimentFromText(`${base.title} ${base.summary}`);
  const fresh = freshnessFactor(base.publishedAt);

  const impactScore = Math.max(1, Math.min(10, Math.round(sentimentScore)));

  const effectiveSourceScore = 0.4 * prior + 0.6 * (base.sourceReliabilityScore ?? prior);

  // Skaluje do 0–100: 60% wpływ sentymentu (znormalizowanego do 0–1),
  // 30% jakość źródła, 10% świeżość.
  const sentimentNorm = impactScore / 10; // 0–1
  const finalNorm = sentimentNorm * 0.6 + effectiveSourceScore * 0.3 + fresh * 0.1;
  const finalScore = Math.max(0, Math.min(100, Math.round(finalNorm * 100)));

  return {
    ...base,
    direction,
    impactScore,
    sourceScore: effectiveSourceScore,
    finalScore,
  };
}
