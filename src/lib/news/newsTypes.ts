export type RecommendationDecision = "BUY" | "SELL" | "HOLD";

export interface RecommendationResult {
  assetId: string;
  decision: RecommendationDecision;
  reason: string;
  confidence: number;
  createdAt: string;
  validUntil: string;
}

export type EventImpactDirection = "positive" | "negative" | "neutral";

export interface NewsEventImpact {
  id: string;
  assetId: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  dateRange?: {
    from: string;
    to: string;
  };
  direction: EventImpactDirection;
  strength: number;
  source: string;
}

// Backend-domain representation of a news event stored in Supabase.
// This is deliberately more detailed than NewsEventImpact (which is UI-focused).
export type AssetEventDirection = "POS" | "NEG" | "NEU";

export interface AssetEvent {
  id: string;
  asset: string;
  title: string;
  summary: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  direction: AssetEventDirection;
  impactScore: number;
  sourceScore: number;
  finalScore: number;
  predictionDirection?: AssetEventDirection | null;
  observedDirection?: AssetEventDirection | null;
  sourceReliabilityScore?: number | null;
}
