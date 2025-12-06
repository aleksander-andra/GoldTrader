import type { NewsEventImpact } from "./newsTypes";

export interface NewsProvider {
  getEvents(assetId: string): Promise<NewsEventImpact[]>;
}
