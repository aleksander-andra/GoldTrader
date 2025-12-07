import type { AssetEvent } from "./newsTypes";

export interface NewsSource {
  id: string;
  fetchEventsForAsset(asset: string): Promise<AssetEvent[]>;
}
