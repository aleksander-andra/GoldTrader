import type { APIContext } from "astro";

const METALS_API_KEY = import.meta.env.METALS_API_KEY;
const METALS_API_URL = import.meta.env.METALS_API_URL || "https://api.metals.dev/v1/latest";
const METALS_CACHE_TTL_MS = Number(import.meta.env.METALS_CACHE_TTL_MS) || 12 * 60 * 60 * 1000; // 12h

let cachedPrice: { value: number; ts: number } | null = null;

async function fetchLatestXauusdPrice(): Promise<number | null> {
  if (!METALS_API_KEY) return null;

  const now = Date.now();
  if (cachedPrice && now - cachedPrice.ts < METALS_CACHE_TTL_MS) {
    return cachedPrice.value;
  }

  try {
    const url = new URL(METALS_API_URL);
    url.searchParams.set("api_key", METALS_API_KEY);
    url.searchParams.set("currency", "USD");
    url.searchParams.set("unit", "toz");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { metals?: { gold?: number } } | null;
    const price = json?.metals?.gold;
    if (typeof price !== "number" || price <= 0) return cachedPrice?.value ?? null;
    cachedPrice = { value: price, ts: now };
    return price;
  } catch {
    return cachedPrice?.value ?? null;
  }
}

// GET /api/prices?symbol=XAUUSD&range=1d
// Jeśli skonfigurowano METALS_API_KEY, używamy Metals-API do ustalenia
// aktualnej ceny XAUUSD i generujemy wokół niej mockowy szereg OHLC.
// W przeciwnym razie zwracamy czysto mockowane świece.
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

  // Prosty deterministyczny generator świec: 60 punktów (co 24 min wstecz od teraz)
  // Kształt wykresu nie używa losowości – jest stały dla danej ceny startowej.
  const steps = 60;
  const price = (await fetchLatestXauusdPrice()) ?? 2400; // start z Metals-API lub fallback
  const amplitude = price * 0.005; // ±0.5%

  for (let i = steps - 1; i >= 0; i -= 1) {
    const ts = now - (i * (24 * 60 * 60 * 1000)) / steps;
    const progress = i / Math.max(steps - 1, 1);
    const wave = Math.sin(progress * 2 * Math.PI); // od -1 do 1
    const close = price + wave * amplitude;
    const open = price;
    const high = Math.max(open, close) + amplitude * 0.2;
    const low = Math.min(open, close) - amplitude * 0.2;

    points.push({ t: ts, o: open, h: high, l: low, c: close });
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
