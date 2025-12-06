import type { APIContext } from "astro";
import { getRecommendationForAsset } from "../../../lib/ai/recommendationService";

export const prerender = false;

// GET /api/news/recommendation?assetId=XAUUSD
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
    const recommendation = await getRecommendationForAsset(assetId, {
      useCache: true,
    });

    if (!recommendation) {
      return new Response(JSON.stringify({ error: "No recommendation available" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: recommendation }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch recommendation", error);

    return new Response(JSON.stringify({ error: "Failed to fetch recommendation" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
