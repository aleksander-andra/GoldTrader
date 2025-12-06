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
