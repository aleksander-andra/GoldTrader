import type { APIContext } from "astro";
import { getBaselineForecastForXauusd } from "../../../../lib/forecast/baselineModel";
import { storeBaselineForecast } from "../../../../lib/forecast/storeForecastService";

export const prerender = false;

// POST /api/admin/forecast/run-baseline
// Security: expects X-Cron-Secret header matching NEWS_CRON_SECRET env (jak inne zadania admin/cron).
export async function POST(context: APIContext) {
  const secretRaw =
    (typeof process !== "undefined" && process.env.NEWS_CRON_SECRET) || import.meta.env.NEWS_CRON_SECRET;
  const cronSecret = typeof secretRaw === "string" ? secretRaw.trim() : "";
  const headerRaw = context.request.headers.get("x-cron-secret");
  const header = headerRaw ? headerRaw.trim() : "";

  if (!cronSecret || !header || header !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const forecast = await getBaselineForecastForXauusd();
    if (!forecast) {
      return new Response(JSON.stringify({ error: "No forecast available" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { modelRunId, forecastId } = await storeBaselineForecast(forecast);

    return new Response(
      JSON.stringify({
        data: {
          forecast,
          modelRunId,
          forecastId,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] run-baseline failed", error);
    return new Response(JSON.stringify({ error: "Failed to run baseline forecast" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
