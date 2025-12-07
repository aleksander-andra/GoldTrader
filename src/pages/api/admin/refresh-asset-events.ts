import type { APIContext } from "astro";
import { refreshAssetEvents } from "../../../lib/news/newsRefreshService";

export const prerender = false;

// POST /api/admin/refresh-asset-events
// Simple admin/cron endpoint to refresh news events for a given asset.
// Security: expects X-Cron-Secret header matching NEWS_CRON_SECRET env.
export async function POST(context: APIContext) {
  const secretRaw = import.meta.env.NEWS_CRON_SECRET;
  const cronSecret = typeof secretRaw === "string" ? secretRaw.trim() : "";
  const headerRaw = context.request.headers.get("x-cron-secret");
  const header = headerRaw ? headerRaw.trim() : "";

  if (!cronSecret || !header || header !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  const { asset } = (body as { asset?: unknown }) ?? {};
  const assetId = typeof asset === "string" && asset.trim() ? asset.trim().toUpperCase() : "XAUUSD";

  const result = await refreshAssetEvents(assetId);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
