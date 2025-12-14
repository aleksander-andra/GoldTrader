import type { APIContext } from "astro";

const METALS_API_KEY = import.meta.env.METALS_API_KEY;
const METALS_API_URL = import.meta.env.METALS_API_URL || "https://api.metals.dev/v1/latest";
const METALS_CACHE_TTL_MS = Number(import.meta.env.METALS_CACHE_TTL_MS) || 12 * 60 * 60 * 1000; // 12h

const priceCache = new Map<string, { value: number; ts: number; unit: string }>();

// Mapowanie symboli użytkownika na nazwy metali w Metals.dev API
const METAL_SYMBOL_MAP: Record<string, { apiKey: string; unit: string; fallback: number }> = {
  // Złoto (fallback: ~4300 USD/oz - aktualna cena z grudnia 2025)
  XAUUSD: { apiKey: "gold", unit: "toz", fallback: 4300 },
  GOLD: { apiKey: "gold", unit: "toz", fallback: 4300 },
  // Srebro
  XAGUSD: { apiKey: "silver", unit: "toz", fallback: 30 },
  SILVER: { apiKey: "silver", unit: "toz", fallback: 30 },
  // Platyna
  XPTUSD: { apiKey: "platinum", unit: "toz", fallback: 1000 },
  PLATINUM: { apiKey: "platinum", unit: "toz", fallback: 1000 },
  // Pallad
  XPDUSD: { apiKey: "palladium", unit: "toz", fallback: 2000 },
  PALLADIUM: { apiKey: "palladium", unit: "toz", fallback: 2000 },
  // Miedź
  XCUUSD: { apiKey: "copper", unit: "lb", fallback: 4.5 },
  COPPER: { apiKey: "copper", unit: "lb", fallback: 4.5 },
  // Aluminium
  ALUMINUM: { apiKey: "aluminum", unit: "lb", fallback: 1.2 },
  ALUMINIUM: { apiKey: "aluminum", unit: "lb", fallback: 1.2 },
  // Cynk
  ZINC: { apiKey: "zinc", unit: "lb", fallback: 1.5 },
  // Nikiel
  NICKEL: { apiKey: "nickel", unit: "lb", fallback: 8.0 },
  // Ołów
  LEAD: { apiKey: "lead", unit: "lb", fallback: 1.0 },
  // Cyna
  TIN: { apiKey: "tin", unit: "lb", fallback: 12.0 },
  // Żelazo (Iron Ore)
  IRON: { apiKey: "iron", unit: "mt", fallback: 120 },
  IRONORE: { apiKey: "iron", unit: "mt", fallback: 120 },
};

/**
 * Pobiera aktualną cenę metalu z Metals.dev API
 * API zwraca wszystkie metale w jednej odpowiedzi, więc pobieramy wszystkie i cache'ujemy
 */
async function fetchAllMetalsPrices(): Promise<Record<string, number> | null> {
  if (!METALS_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn("[prices] METALS_API_KEY not configured - using fallback prices");
    return null;
  }

  const cacheKey = "all_metals";
  const now = Date.now();
  const cached = priceCache.get(cacheKey);
  if (cached && now - cached.ts < METALS_CACHE_TTL_MS) {
    // Return cached prices from a separate cache structure
    const cachedPrices: Record<string, number> = {};
    for (const [key, value] of priceCache.entries()) {
      if (key !== cacheKey && value.value) {
        cachedPrices[key] = value.value;
      }
    }
    return Object.keys(cachedPrices).length > 0 ? cachedPrices : null;
  }

  try {
    // Metals.dev API zwraca wszystkie metale w jednej odpowiedzi
    const url = new URL(METALS_API_URL);
    url.searchParams.set("api_key", METALS_API_KEY);
    url.searchParams.set("currency", "USD");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error(`[prices] Metals.dev API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const json = (await res.json()) as {
      metals?: {
        gold?: number;
        silver?: number;
        platinum?: number;
        palladium?: number;
        copper?: number;
        aluminum?: number;
        zinc?: number;
        nickel?: number;
        lead?: number;
        tin?: number;
        iron?: number;
      };
    } | null;

    if (!json?.metals) {
      // eslint-disable-next-line no-console
      console.warn("[prices] Metals.dev API returned no metals data");
      return null;
    }

    // eslint-disable-next-line no-console
    console.log("[prices] Successfully fetched metals prices from Metals.dev API:", Object.keys(json.metals));

    // Cache individual metal prices
    const metals = json.metals;
    for (const [apiKey, price] of Object.entries(metals)) {
      if (typeof price === "number" && price > 0) {
        const metalConfig = Object.values(METAL_SYMBOL_MAP).find((m) => m.apiKey === apiKey);
        priceCache.set(apiKey, {
          value: price,
          ts: now,
          unit: metalConfig?.unit || "oz",
        });
      }
    }

    // Mark that we've fetched all metals
    priceCache.set(cacheKey, { value: 1, ts: now, unit: "" });

    return metals as Record<string, number>;
  } catch {
    return null;
  }
}

/**
 * Pobiera cenę konkretnego metalu
 */
async function fetchMetalPrice(symbol: string): Promise<{ price: number; unit: string } | null> {
  const metalConfig = METAL_SYMBOL_MAP[symbol.toUpperCase()];
  if (!metalConfig) {
    return null;
  }

  // Najpierw spróbuj pobrać wszystkie metale (cache'uje wszystkie)
  const allPrices = await fetchAllMetalsPrices();
  if (allPrices && allPrices[metalConfig.apiKey]) {
    return {
      price: allPrices[metalConfig.apiKey],
      unit: metalConfig.unit,
    };
  }

  // Fallback: sprawdź cache
  const cached = priceCache.get(metalConfig.apiKey);
  if (cached) {
    return {
      price: cached.value,
      unit: cached.unit,
    };
  }

  // Ostateczny fallback
  return {
    price: metalConfig.fallback,
    unit: metalConfig.unit,
  };
}

// GET /api/prices?symbol=XAUUSD|XCUUSD|PLATINUM|SILVER|...&range=1d
// Jeśli skonfigurowano METALS_API_KEY, używamy Metals-API do ustalenia
// aktualnej ceny i generujemy wokół niej mockowy szereg OHLC.
// W przeciwnym razie zwracamy czysto mockowane świece.
// Obsługuje wszystkie metale dostępne w Metals.dev API
export async function GET(context: APIContext) {
  const url = new URL(context.request.url);
  const symbol = (url.searchParams.get("symbol") || "XAUUSD").toUpperCase();
  const range = url.searchParams.get("range") || "1d";

  // Pobierz konfigurację metalu
  const metalConfig = METAL_SYMBOL_MAP[symbol];
  if (!metalConfig) {
    const supportedSymbols = Object.keys(METAL_SYMBOL_MAP).join(", ");
    return new Response(
      JSON.stringify({
        error: `Symbol ${symbol} not supported. Supported symbols: ${supportedSymbols}`,
        supported_symbols: Object.keys(METAL_SYMBOL_MAP),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Pobierz aktualną cenę metalu
  const metalPrice = await fetchMetalPrice(symbol);
  if (!metalPrice) {
    return new Response(
      JSON.stringify({
        error: `Failed to fetch price for ${symbol}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const now = Date.now();
  const points: { t: number; o: number; h: number; l: number; c: number }[] = [];

  // Prosty deterministyczny generator świec: 60 punktów (co 24 min wstecz od teraz)
  // Kształt wykresu nie używa losowości – jest stały dla danej ceny startowej.
  const steps = 60;
  const price = metalPrice.price;
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
      unit: metalPrice.unit,
      latest_price: price,
      candles: points,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
