import type { SupabaseDbClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";

type AssetEventRow = Database["public"]["Tables"]["asset_events"]["Row"];

interface GetTopEventsOptions {
  limit?: number;
}

const DEFAULT_LIMIT = 10;

export async function getTopAssetEventsForAsset(
  client: SupabaseDbClient,
  asset: string,
  options: GetTopEventsOptions = {}
): Promise<AssetEventRow[]> {
  const { limit = DEFAULT_LIMIT } = options;

  if (!asset) {
    return [];
  }

  const { data, error } = await client
    .from("asset_events")
    .select("*")
    .eq("asset", asset)
    .order("final_score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    const message = error.message || "";

    // If table does not exist yet (e.g. before migrations), fail soft with empty list.
    if (/asset_events|relation|does not exist/i.test(message)) {
      return [];
    }

    // eslint-disable-next-line no-console
    console.error("Failed to fetch asset_events for asset", asset, error);
    return [];
  }

  return data ?? [];
}
