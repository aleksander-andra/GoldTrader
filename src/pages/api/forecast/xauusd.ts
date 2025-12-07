import { getBaselineForecastForXauusd } from "../../../lib/forecast/baselineModel";

export const prerender = false;

// GET /api/forecast/xauusd
// Public baseline forecast for XAUUSD using simple technical features (no auth, read-only).
export async function GET() {
  try {
    const forecast = await getBaselineForecastForXauusd();
    if (!forecast) {
      return new Response(JSON.stringify({ error: "No forecast available" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: forecast }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[forecast] /api/forecast/xauusd failed", error);
    return new Response(JSON.stringify({ error: "Failed to compute forecast" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
