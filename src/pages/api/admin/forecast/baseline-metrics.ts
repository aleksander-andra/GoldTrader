import type { APIContext } from "astro";
import { computeBaselineAccuracy } from "../../../../lib/forecast/baselineBacktest";

export const prerender = false;

// GET /api/forecast/baseline-metrics
export async function GET(context: APIContext) {
  const url = new URL(context.request.url);
  const windowParam = url.searchParams.get("windowDays");
  const windowNum = windowParam ? Number(windowParam) : Number.NaN;
  const windowDays = Number.isFinite(windowNum) && windowNum > 0 ? windowNum : 90;

  try {
    const result = await computeBaselineAccuracy(windowDays);

    return new Response(
      JSON.stringify({
        windowDays: result.windowDays,
        totalSamples: result.totalSamples,
        correct: result.correct,
        accuracy: Math.round(result.accuracy * 100), // 0–100%
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] baseline-metrics failed", error);
    return new Response(JSON.stringify({ error: "Failed to compute baseline metrics" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
