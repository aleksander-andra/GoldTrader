import type { APIContext } from "astro";

// GET /api/prices?symbol=XAUUSD&range=1d
// MVP: zwracamy mockowane świece OHLC dla XAUUSD (bez realnego providera danych).
export async function GET(context: APIContext) {
  const url = new URL(context.request.url);
  const symbol = (url.searchParams.get("symbol") || "XAUUSD").toUpperCase();
  const range = url.searchParams.get("range") || "1d";

  if (symbol !== "XAUUSD") {
    return new Response(JSON.stringify({ error: "Only XAUUSD is supported in MVP." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const points: { t: number; o: number; h: number; l: number; c: number }[] = [];

  // Prosty generator mockowych świec: 60 punktów (co 24 min wstecz od teraz)
  const steps = 60;
  let price = 2400; // arbitralny punkt startowy

  for (let i = steps - 1; i >= 0; i -= 1) {
    const ts = now - (i * (24 * 60 * 60 * 1000)) / steps;
    const drift = (Math.random() - 0.5) * 5; // ±5 USD
    const open = price;
    const close = price + drift;
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;

    points.push({ t: ts, o: open, h: high, l: low, c: close });
    price = close;
  }

  return new Response(
    JSON.stringify({
      symbol,
      range,
      candles: points,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
