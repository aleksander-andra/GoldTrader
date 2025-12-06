import type { APIContext } from "astro";
import { getNewsEventsForAsset } from "../../../lib/news/newsService";

export const prerender = false;

// GET /api/news/events?assetId=XAUUSD
export async function GET(context: APIContext) {
  const url = new URL(context.request.url);
  const assetId = url.searchParams.get("assetId") || "XAUUSD";

  if (!assetId) {
    return new Response(JSON.stringify({ error: "assetId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const events = await getNewsEventsForAsset(assetId, {
      useCache: true,
    });

    return new Response(JSON.stringify({ items: events }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch news events", error);

    return new Response(JSON.stringify({ error: "Failed to fetch news events" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
