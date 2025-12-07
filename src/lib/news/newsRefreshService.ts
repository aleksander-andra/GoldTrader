import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { fetchRawEventsFromAllSources } from "./newsAggregator";
import { scoreAssetEvent } from "./newsScoringService";

// Service-role Supabase client for cron/task usage.
function createServiceRoleClient() {
  const url = import.meta.env.SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for newsRefreshService");
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function refreshAssetEvents(asset: string): Promise<{ asset: string; inserted: number }> {
  if (!asset) {
    return { asset, inserted: 0 };
  }

  const rawEvents = await fetchRawEventsFromAllSources(asset);
  if (!rawEvents.length) {
    // eslint-disable-next-line no-console
    console.log("newsRefreshService: no raw events fetched for asset", asset);
    return { asset, inserted: 0 };
  }

  const scored = rawEvents.map((ev) => scoreAssetEvent(ev));
  // eslint-disable-next-line no-console
  console.log(
    "newsRefreshService: scored events sample",
    asset,
    scored.length,
    scored.slice(0, 3).map((e) => ({
      title: e.title,
      publishedAt: e.publishedAt,
      finalScore: e.finalScore,
      source: e.sourceName,
    }))
  );

  const client = createServiceRoleClient();

  // Upsert events based on (asset, source_url) uniqueness.
  const payload = scored.map((ev) => ({
    asset: ev.asset,
    title: ev.title,
    summary: ev.summary,
    published_at: ev.publishedAt,
    source_name: ev.sourceName,
    source_url: ev.sourceUrl,
    direction: ev.direction,
    impact_score: ev.impactScore,
    source_score: ev.sourceScore,
    final_score: ev.finalScore,
    prediction_direction: ev.predictionDirection ?? null,
    observed_direction: ev.observedDirection ?? null,
    source_reliability_score: ev.sourceReliabilityScore ?? null,
  }));

  const { error } = await client
    .from("asset_events")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(payload as any, {
      onConflict: "asset,source_url",
    });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("newsRefreshService: failed to upsert asset_events", error);
    return { asset, inserted: 0 };
  }

  // NOTE: exact inserted/updated count is not trivial to obtain from upsert; we return length of payload.
  return { asset, inserted: payload.length };
}
