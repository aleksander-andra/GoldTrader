/**
 * OpenAI Function Calling Tools for GoldTrader Chatbot
 * Defines available tools and their implementations
 */

import type { Database } from "../../db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

// Mapowanie symboli użytkownika na nazwy metali w Metals.dev API
const METAL_SYMBOL_MAP: Record<string, { apiKey: string; unit: string; fallback: number }> = {
  // Złoto
  XAUUSD: { apiKey: "gold", unit: "toz", fallback: 2400 },
  GOLD: { apiKey: "gold", unit: "toz", fallback: 2400 },
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

// Helper function to get metal name in Polish
function getMetalName(symbol: string): string {
  const names: Record<string, string> = {
    XAUUSD: "Złoto",
    GOLD: "Złoto",
    XAGUSD: "Srebro",
    SILVER: "Srebro",
    XPTUSD: "Platyna",
    PLATINUM: "Platyna",
    XPDUSD: "Pallad",
    PALLADIUM: "Pallad",
    XCUUSD: "Miedź",
    COPPER: "Miedź",
    ALUMINUM: "Aluminium",
    ALUMINIUM: "Aluminium",
    ZINC: "Cynk",
    NICKEL: "Nikiel",
    LEAD: "Ołów",
    TIN: "Cyna",
    IRON: "Żelazo",
    IRONORE: "Żelazo",
  };
  return names[symbol.toUpperCase()] || symbol;
}

// Helper to translate Polish keywords to English for news search
function translateQueryToEnglish(query: string): string {
  const translations: Record<string, string> = {
    inflacja: "inflation",
    złoto: "gold",
    srebro: "silver",
    miedź: "copper",
    platyna: "platinum",
    pallad: "palladium",
    aluminium: "aluminum",
    cynk: "zinc",
    nikiel: "nickel",
    ołów: "lead",
    cyna: "tin",
    żelazo: "iron",
    stopy: "interest rates",
    "stopy procentowe": "interest rates",
    fed: "federal reserve",
    rezerwa: "reserve",
    bank: "bank",
    giełda: "stock market",
    rynki: "markets",
    cena: "price",
    kurs: "exchange rate",
    waluta: "currency",
    dolar: "dollar",
    euro: "euro",
    kryptowaluty: "cryptocurrency",
    bitcoin: "bitcoin",
    ethereum: "ethereum",
    gospodarka: "economy",
    gospodarczy: "economic",
    bezrobocie: "unemployment",
    pkb: "gdp",
    wzrost: "growth",
    spadek: "decline",
    kryzys: "crisis",
    wojna: "war",
    konflikt: "conflict",
    geopolityka: "geopolitics",
    sankcje: "sanctions",
    embargo: "embargo",
  };

  const queryLower = query.toLowerCase().trim();

  // Check if query contains Polish words
  for (const [polish, english] of Object.entries(translations)) {
    if (queryLower.includes(polish)) {
      // Replace Polish word with English translation
      const regex = new RegExp(polish, "gi");
      return query.replace(regex, english);
    }
  }

  // If no translation found, return original query
  // NewsAPI should handle it (might find results anyway)
  return query;
}

// Helper to search news in external services (NewsAPI, Alpha Vantage)
async function searchExternalNewsServices(
  query: string,
  assetId: string | null,
  limit: number
): Promise<
  {
    title: string;
    summary: string;
    published_at: string;
    source_name: string;
    source_url: string;
    asset: string;
  }[]
> {
  const results: {
    title: string;
    summary: string;
    published_at: string;
    source_name: string;
    source_url: string;
    asset: string;
  }[] = [];

  // Translate Polish query to English for better results
  const englishQuery = translateQueryToEnglish(query);

  // Search NewsAPI if configured
  const newsApiUrl = import.meta.env.NEWS_API_URL;
  const newsApiKey = import.meta.env.NEWS_API_KEY;

  if (newsApiUrl && newsApiKey) {
    try {
      // NewsAPI uses /v2/everything endpoint for search queries
      // Handle both full URLs and base URLs
      let apiBaseUrl = newsApiUrl;
      if (!apiBaseUrl.includes("/v2/")) {
        // If URL doesn't contain /v2/, assume it's base URL and add /v2/everything
        apiBaseUrl = apiBaseUrl.replace(/\/$/, ""); // Remove trailing slash
        apiBaseUrl = `${apiBaseUrl}/v2/everything`;
      } else if (apiBaseUrl.endsWith("/v2") || apiBaseUrl.endsWith("/v2/")) {
        // If URL ends with /v2, add /everything
        apiBaseUrl = `${apiBaseUrl.replace(/\/$/, "")}/everything`;
      }

      const url = new URL(apiBaseUrl);
      url.searchParams.set("apiKey", newsApiKey);
      url.searchParams.set("q", englishQuery); // Use translated query
      url.searchParams.set("language", "en"); // NewsAPI primarily has English articles
      url.searchParams.set("pageSize", String(Math.min(limit * 2, 100))); // Get more to filter
      url.searchParams.set("sortBy", "publishedAt");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const json = (await res.json()) as {
          status?: string;
          articles?:
            | {
                title?: string | null;
                description?: string | null;
                url?: string | null;
                publishedAt?: string | null;
                source?: { name?: string | null } | null;
              }[]
            | null;
        };

        // Check if request was successful
        if (json.status === "ok" && json.articles) {
          const articles = json.articles;
          const queryLower = query.toLowerCase();
          const englishQueryLower = englishQuery.toLowerCase();

          for (const article of articles) {
            const title = (article.title || "").trim();
            const summary = (article.description || title).trim();
            const urlStr = (article.url || "").trim();
            const published = (article.publishedAt || "").trim();
            const sourceName = (article.source?.name || "NewsAPI").trim();

            // Filter by query - check both original (Polish) and translated (English) query
            const titleLower = title.toLowerCase();
            const summaryLower = summary.toLowerCase();
            const matchesOriginal = titleLower.includes(queryLower) || summaryLower.includes(queryLower);
            const matchesEnglish = titleLower.includes(englishQueryLower) || summaryLower.includes(englishQueryLower);

            if (matchesOriginal || matchesEnglish) {
              if (title && urlStr && published) {
                results.push({
                  title,
                  summary: summary.length > 300 ? `${summary.slice(0, 300)}…` : summary,
                  published_at: new Date(published).toISOString(),
                  source_name: sourceName,
                  source_url: urlStr,
                  asset: assetId || "UNKNOWN",
                });
              }
            }
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn("NewsAPI returned non-ok status:", json.status);
        }
      } else {
        const errorText = await res.text().catch(() => "");
        // eslint-disable-next-line no-console
        console.warn("NewsAPI request failed:", res.status, errorText);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to search NewsAPI", error);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn("NewsAPI not configured: NEWS_API_URL or NEWS_API_KEY missing");
  }

  // Search Alpha Vantage if configured (only for XAUUSD/gold related queries)
  const alphaKey = import.meta.env.ALPHA_VANTAGE_API_KEY;
  const isGoldRelated =
    query.toLowerCase().includes("gold") ||
    query.toLowerCase().includes("złoto") ||
    query.toLowerCase().includes("xau") ||
    assetId === "XAUUSD";

  if (alphaKey && isGoldRelated) {
    try {
      const url = new URL("https://www.alphavantage.co/query");
      url.searchParams.set("function", "NEWS_SENTIMENT");
      url.searchParams.set("tickers", "XAU");
      url.searchParams.set("sort", "LATEST");
      url.searchParams.set("limit", String(Math.min(limit * 2, 50)));

      const res = await fetch(`${url.toString()}&apikey=${alphaKey}`, {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const json = (await res.json()) as {
          feed?:
            | {
                title?: string;
                summary?: string;
                url?: string;
                time_published?: string;
                source?: string;
              }[]
            | null;
        };

        const feed = json.feed || [];
        const queryLower = query.toLowerCase();

        for (const item of feed) {
          const title = (item.title || "").trim();
          const summary = (item.summary || title).trim();
          const urlStr = (item.url || "").trim();
          const timePublished = item.time_published || "";
          const sourceName = (item.source || "Alpha Vantage").trim();

          // Filter by query
          if (title.toLowerCase().includes(queryLower) || summary.toLowerCase().includes(queryLower)) {
            if (title && urlStr && timePublished) {
              // Parse Alpha Vantage time format: YYYYMMDDTHHMMSS
              const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/.exec(timePublished);
              let publishedAt = new Date().toISOString();
              if (m) {
                const [, y, mo, d, h, mi, s = "00"] = m;
                publishedAt = new Date(
                  Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
                ).toISOString();
              }

              results.push({
                title,
                summary: summary.length > 300 ? `${summary.slice(0, 300)}…` : summary,
                published_at: publishedAt,
                source_name: sourceName,
                source_url: urlStr,
                asset: "XAUUSD",
              });
            }
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to search Alpha Vantage", error);
    }
  }

  // Remove duplicates by URL and sort by date
  const unique = Array.from(new Map(results.map((item) => [item.source_url, item])).values())
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, limit);

  return unique;
}

// Helper to fetch all metals prices from Metals.dev API
async function fetchAllMetalsPrices(): Promise<Record<string, number> | null> {
  const METALS_API_KEY = import.meta.env.METALS_API_KEY;
  const METALS_API_URL = import.meta.env.METALS_API_URL || "https://api.metals.dev/v1/latest";

  if (!METALS_API_KEY) return null;

  try {
    const url = new URL(METALS_API_URL);
    url.searchParams.set("api_key", METALS_API_KEY);
    url.searchParams.set("currency", "USD");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

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

    if (!json?.metals) return null;
    return json.metals as Record<string, number>;
  } catch {
    return null;
  }
}

/**
 * OpenAI Function definitions (tools schema)
 */
export const TOOLS_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_signals",
      description:
        "Pobierz aktywne sygnały tradingowe dla danego aktywa. Zwraca tylko zaakceptowane i aktualnie ważne sygnały.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Symbol aktywa (np. XAUUSD)",
            default: "XAUUSD",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_prices",
      description:
        "Pobierz historię cen (OHLCV) dla danego metalu w określonym zakresie czasowym. Obsługuje wszystkie metale dostępne w Metals.dev API: złoto (XAUUSD/GOLD), srebro (XAGUSD/SILVER), platyna (XPTUSD/PLATINUM), pallad (XPDUSD/PALLADIUM), miedź (XCUUSD/COPPER), aluminium (ALUMINUM), cynk (ZINC), nikiel (NICKEL), ołów (LEAD), cyna (TIN), żelazo (IRON/IRONORE).",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description:
              "Symbol metalu (np. XAUUSD, XAGUSD, PLATINUM, COPPER, SILVER, ALUMINUM, ZINC, NICKEL, LEAD, TIN, IRON). Możesz użyć zarówno symboli (XAUUSD) jak i nazw (GOLD, SILVER, PLATINUM, COPPER, itp.)",
            default: "XAUUSD",
          },
          range: {
            type: "string",
            description: "Zakres czasowy: 1d, 7d, 30d, 90d, 1y",
            enum: ["1d", "7d", "30d", "90d", "1y"],
            default: "7d",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_forecast",
      description: "Pobierz aktualną prognozę baseline dla XAUUSD (kierunek UP/DOWN/FLAT i confidence).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_news",
      description: "Pobierz najnowsze newsy/wydarzenia dotyczące danego aktywa z analizą sentymentu.",
      parameters: {
        type: "object",
        properties: {
          assetId: {
            type: "string",
            description: "ID aktywa (np. XAUUSD)",
            default: "XAUUSD",
          },
          limit: {
            type: "number",
            description: "Maksymalna liczba newsów (domyślnie 10)",
            default: 10,
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_baseline_metrics",
      description: "Pobierz metryki jakości baseline modelu (accuracy, windowDays, totalSamples). Tylko dla admina.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_news",
      description:
        "Wyszukaj newsy po słowach kluczowych w tytule, podsumowaniu lub nazwie assetu. Jeśli assetId nie jest podany, szuka we wszystkich assetach. Zwraca newsy z bazy danych asset_events.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Słowa kluczowe do wyszukania (np. 'inflacja', 'złoto', 'gold', 'XAUUSD')",
          },
          assetId: {
            type: "string",
            description:
              "Opcjonalny ID aktywa do filtrowania (np. XAUUSD). Jeśli nie podano, szuka we wszystkich assetach.",
          },
          limit: {
            type: "number",
            description: "Maksymalna liczba wyników (domyślnie 10)",
            default: 10,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_signals",
      description:
        "Przeanalizuj sygnały i zwróć statystyki: liczba sygnałów, średnia confidence, rozkład typów (BUY/SELL/HOLD).",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Symbol aktywa (np. XAUUSD)",
            default: "XAUUSD",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_strategies",
      description: "Porównaj skuteczność różnych strategii na podstawie sygnałów (hit rate, średnia confidence).",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Symbol aktywa (np. XAUUSD)",
            default: "XAUUSD",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_metal_performance",
      description:
        "Przeanalizuj wzrost/spadek cen metali w określonym okresie. Porównuje aktualne ceny z cenami historycznymi z bazy danych (jeśli dostępne) lub używa aktualnych cen do oszacowania trendu.",
      parameters: {
        type: "object",
        properties: {
          period_days: {
            type: "number",
            description: "Okres analizy w dniach (np. 180 dla 6 miesięcy, 90 dla 3 miesięcy)",
            default: 180,
          },
          top_n: {
            type: "number",
            description: "Liczba najlepszych metali do zwrócenia (domyślnie 5)",
            default: 5,
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Execute a tool call and return result
 */
export async function executeTool(
  toolCall: ToolCall,
  supabase: SupabaseClient<Database>,
  userId: string,
  userRole: "admin" | "user",
  baseUrl: string,
  authToken: string
): Promise<ToolResult> {
  const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;

  try {
    switch (toolCall.name) {
      case "get_signals": {
        const symbol = (args.symbol as string) || "XAUUSD";
        const nowIso = new Date().toISOString();

        // Get asset ID
        const { data: asset } = await supabase.from("assets").select("id").eq("symbol", symbol).maybeSingle();
        if (!asset) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Asset ${symbol} not found` }),
          };
        }

        // Get active signals
        const { data: signals, error } = await supabase
          .from("signals")
          .select("id, type, confidence, valid_from, valid_to, forecast_price, strategy_id, asset_id")
          .eq("status", "accepted")
          .eq("asset_id", asset.id)
          .gt("valid_to", nowIso)
          .order("valid_from", { ascending: true })
          .limit(20);

        if (error) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message }),
          };
        }

        // Get strategy names
        const signalsWithStrategies = await Promise.all(
          (signals || []).map(async (signal) => {
            const { data: strategy } = await supabase
              .from("strategies")
              .select("name, type")
              .eq("id", signal.strategy_id)
              .maybeSingle();

            return {
              ...signal,
              strategy_name: strategy?.name || "Unknown",
              strategy_type: strategy?.type || "Unknown",
            };
          })
        );

        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({ signals: signalsWithStrategies, count: signalsWithStrategies.length }),
        };
      }

      case "get_prices": {
        const symbol = (args.symbol as string) || "XAUUSD";
        const range = (args.range as string) || "7d";

        // /api/prices is public, no auth needed
        const response = await fetch(`${baseUrl}/api/prices?symbol=${symbol}&range=${range}`);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Failed to fetch prices: ${response.status} - ${errorText}` }),
          };
        }

        const data = (await response.json()) as {
          candles?: unknown[];
          symbol?: string;
          range?: string;
          unit?: string;
          latest_price?: number;
          error?: string;
          supported_symbols?: string[];
        };

        if (data.error) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: data.error,
              supported_symbols: data.supported_symbols || [],
            }),
          };
        }

        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            symbol: data.symbol || symbol,
            range: data.range || range,
            unit: data.unit || "oz",
            latest_price:
              data.latest_price ||
              (data.candles && data.candles.length > 0
                ? (data.candles[data.candles.length - 1] as { c?: number })?.c
                : null),
            candles: data.candles || [],
            count: data.candles?.length || 0,
          }),
        };
      }

      case "get_forecast": {
        // /api/forecast/xauusd is public, no auth needed
        const response = await fetch(`${baseUrl}/api/forecast/xauusd`);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Failed to fetch forecast: ${response.status} - ${errorText}` }),
          };
        }

        const data = (await response.json()) as { data?: unknown; error?: string };
        if (data.error) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: data.error }),
          };
        }
        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({ forecast: data.data || data }),
        };
      }

      case "get_news": {
        const assetId = (args.assetId as string) || "XAUUSD";
        const limit = (args.limit as number) || 10;

        const response = await fetch(`${baseUrl}/api/news/events?assetId=${assetId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Failed to fetch news: ${response.status}` }),
          };
        }

        const data = (await response.json()) as { items?: unknown[] };
        const items = (data.items || []).slice(0, limit);
        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({ news: items, count: items.length }),
        };
      }

      case "get_baseline_metrics": {
        if (userRole !== "admin") {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Admin role required" }),
          };
        }

        const response = await fetch(`${baseUrl}/api/admin/forecast/baseline-metrics`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Failed to fetch metrics: ${response.status}` }),
          };
        }

        const data = (await response.json()) as unknown;
        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({ metrics: data }),
        };
      }

      case "search_news": {
        const query = (args.query as string) || "";
        const assetId = (args.assetId as string) || null; // null = search all assets
        const limit = (args.limit as number) || 10;

        if (!query) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Query parameter is required" }),
          };
        }

        // Step 1: Search external services first (they have more up-to-date data)
        const externalResults = await searchExternalNewsServices(query, assetId, limit);

        // Check if services are configured
        const newsApiUrl = import.meta.env.NEWS_API_URL;
        const newsApiKey = import.meta.env.NEWS_API_KEY;
        const alphaKey = import.meta.env.ALPHA_VANTAGE_API_KEY;
        const servicesConfigured = !!(newsApiUrl && newsApiKey) || !!alphaKey;

        if (externalResults.length > 0) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              news: externalResults,
              count: externalResults.length,
              query,
              source: "external_services",
              message: `Znaleziono ${externalResults.length} newsów w zewnętrznych serwisach (NewsAPI/Alpha Vantage).`,
            }),
          };
        }

        // If no results and services are not configured, inform user
        if (!servicesConfigured) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              news: [],
              count: 0,
              query,
              message: `Nie znaleziono newsów zawierających "${query}". Zewnętrzne serwisy (NewsAPI, Alpha Vantage) nie są skonfigurowane - brakuje zmiennych środowiskowych NEWS_API_URL/NEWS_API_KEY lub ALPHA_VANTAGE_API_KEY.`,
              hint: "Aby wyszukiwać newsy w zewnętrznych serwisach, skonfiguruj NEWS_API_URL, NEWS_API_KEY lub ALPHA_VANTAGE_API_KEY w zmiennych środowiskowych.",
            }),
          };
        }

        // Step 2: If no results in external services, search database as fallback
        let newsQuery = supabase
          .from("asset_events")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(500); // Get more results to filter from

        if (assetId) {
          newsQuery = newsQuery.eq("asset", assetId);
        }

        const { data: allNews, error } = await newsQuery;

        if (error) {
          // If external search also failed, return error
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: `Failed to search news: ${error.message}`,
              hint: "Sprawdź czy w bazie są newsy w tabeli asset_events",
            }),
          };
        }

        // Filter by query in title, summary, or asset name
        const queryLower = query.toLowerCase();
        let filtered: typeof allNews = [];
        if (allNews && allNews.length > 0) {
          filtered = allNews
            .filter(
              (item) =>
                item.title?.toLowerCase().includes(queryLower) ||
                item.summary?.toLowerCase().includes(queryLower) ||
                item.asset?.toLowerCase().includes(queryLower)
            )
            .slice(0, limit);
        }

        if (filtered.length > 0) {
          // Found results in database
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              news: filtered,
              count: filtered.length,
              query,
              source: "database",
              total_news_in_db: allNews?.length || 0,
              message: `Znaleziono ${filtered.length} newsów w bazie danych.`,
            }),
          };
        }

        // No results anywhere
        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            news: [],
            count: 0,
            query,
            message: `Nie znaleziono newsów zawierających "${query}" ani w zewnętrznych serwisach, ani w bazie danych.`,
            total_news_in_db: allNews?.length || 0,
            hint: "Spróbuj innych słów kluczowych lub sprawdź czy serwisy zewnętrzne są skonfigurowane (NewsAPI, Alpha Vantage).",
          }),
        };
      }

      case "analyze_signals": {
        const symbol = (args.symbol as string) || "XAUUSD";

        // Get asset ID
        const { data: asset } = await supabase.from("assets").select("id").eq("symbol", symbol).maybeSingle();
        if (!asset) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Asset ${symbol} not found` }),
          };
        }

        // Get all signals (accepted, expired, rejected)
        const { data: signals, error } = await supabase
          .from("signals")
          .select("type, confidence, status")
          .eq("asset_id", asset.id)
          .in("status", ["accepted", "expired", "rejected"]);

        if (error) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message }),
          };
        }

        const signalsList = signals || [];
        const total = signalsList.length;
        const buyCount = signalsList.filter((s) => s.type === "BUY").length;
        const sellCount = signalsList.filter((s) => s.type === "SELL").length;
        const holdCount = signalsList.filter((s) => s.type === "HOLD").length;
        const avgConfidence =
          signalsList.length > 0
            ? signalsList.reduce((sum, s) => sum + (s.confidence || 0), 0) / signalsList.length
            : 0;

        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            total,
            buy: buyCount,
            sell: sellCount,
            hold: holdCount,
            avg_confidence: Math.round(avgConfidence * 100) / 100,
          }),
        };
      }

      case "compare_strategies": {
        const symbol = (args.symbol as string) || "XAUUSD";

        // Get asset ID
        const { data: asset } = await supabase.from("assets").select("id").eq("symbol", symbol).maybeSingle();
        if (!asset) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Asset ${symbol} not found` }),
          };
        }

        // Get signals with strategies
        const { data: signals, error } = await supabase
          .from("signals")
          .select("strategy_id, confidence, type, status")
          .eq("asset_id", asset.id)
          .in("status", ["accepted", "expired"]);

        if (error) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error.message }),
          };
        }

        // Group by strategy
        const strategyStats: Record<
          string,
          { name: string; count: number; avg_confidence: number; types: { BUY: number; SELL: number; HOLD: number } }
        > = {};

        for (const signal of signals || []) {
          const { data: strategy } = await supabase
            .from("strategies")
            .select("name")
            .eq("id", signal.strategy_id)
            .maybeSingle();

          const strategyName = strategy?.name || "Unknown";
          if (!strategyStats[strategyName]) {
            strategyStats[strategyName] = {
              name: strategyName,
              count: 0,
              avg_confidence: 0,
              types: { BUY: 0, SELL: 0, HOLD: 0 },
            };
          }

          strategyStats[strategyName].count++;
          strategyStats[strategyName].avg_confidence += signal.confidence || 0;
          strategyStats[strategyName].types[signal.type as "BUY" | "SELL" | "HOLD"]++;
        }

        // Calculate averages
        for (const key in strategyStats) {
          const stat = strategyStats[key];
          stat.avg_confidence = stat.count > 0 ? Math.round((stat.avg_confidence / stat.count) * 100) / 100 : 0;
        }

        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({ strategies: Object.values(strategyStats) }),
        };
      }

      case "analyze_metal_performance": {
        const periodDays = (args.period_days as number) || 180;
        const topN = (args.top_n as number) || 5;

        // Pobierz aktualne ceny wszystkich metali
        const allPrices = await fetchAllMetalsPrices();
        if (!allPrices) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Failed to fetch current metal prices" }),
          };
        }

        // Mapowanie apiKey -> symbol
        const apiKeyToSymbol: Record<string, string> = {};
        for (const [symbol, config] of Object.entries(METAL_SYMBOL_MAP)) {
          apiKeyToSymbol[config.apiKey] = symbol;
        }

        // Dla każdego metalu spróbuj pobrać dane historyczne z bazy
        const performanceData: {
          symbol: string;
          name: string;
          current_price: number;
          unit: string;
          historical_price?: number;
          change_percent?: number;
          has_history: boolean;
        }[] = [];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - periodDays);

        for (const [apiKey, currentPrice] of Object.entries(allPrices)) {
          const symbol = apiKeyToSymbol[apiKey] || apiKey.toUpperCase();
          const metalConfig = Object.values(METAL_SYMBOL_MAP).find((m) => m.apiKey === apiKey);
          if (!metalConfig) continue;

          // Spróbuj pobrać dane historyczne z bazy dla tego metalu
          const { data: historyData, error } = await supabase
            .from("price_history")
            .select("close, ts")
            .eq("asset", symbol)
            .eq("timeframe", "1d")
            .lte("ts", cutoffDate.toISOString())
            .order("ts", { ascending: false })
            .limit(1)
            .maybeSingle();

          let historicalPrice: number | undefined;
          let changePercent: number | undefined;
          let hasHistory = false;

          if (!error && historyData) {
            historicalPrice = historyData.close;
            hasHistory = true;
            if (historicalPrice > 0) {
              changePercent = ((currentPrice - historicalPrice) / historicalPrice) * 100;
            }
          }

          // Jeśli nie ma danych w bazie, spróbuj znaleźć najstarszą dostępną cenę
          if (!hasHistory) {
            const { data: oldestData } = await supabase
              .from("price_history")
              .select("close, ts")
              .eq("asset", symbol)
              .eq("timeframe", "1d")
              .order("ts", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (oldestData) {
              historicalPrice = oldestData.close;
              hasHistory = true;
              if (historicalPrice > 0) {
                changePercent = ((currentPrice - historicalPrice) / historicalPrice) * 100;
              }
            }
          }

          performanceData.push({
            symbol,
            name: getMetalName(symbol),
            current_price: currentPrice,
            unit: metalConfig.unit,
            historical_price: historicalPrice,
            change_percent: changePercent,
            has_history: hasHistory,
          });
        }

        // Sortuj po change_percent (malejąco) i weź top N
        const sorted = performanceData
          .filter((p) => p.change_percent !== undefined)
          .sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0))
          .slice(0, topN);

        // Jeśli nie ma wystarczająco danych z historią, zwróć informację
        if (sorted.length === 0) {
          return {
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: `Brak danych historycznych w bazie dla analizy ${periodDays} dni. System ma dane historyczne tylko dla metali które są synchronizowane (obecnie głównie XAUUSD).`,
              current_prices: performanceData.map((p) => ({
                symbol: p.symbol,
                name: p.name,
                current_price: p.current_price,
                unit: p.unit,
              })),
            }),
          };
        }

        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            period_days: periodDays,
            top_metals: sorted,
            note: sorted.some((p) => !p.has_history)
              ? "Niektóre metale nie mają pełnych danych historycznych w bazie - analiza może być niepełna."
              : "Analiza oparta na danych historycznych z bazy danych.",
          }),
        };
      }

      default:
        return {
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
        };
    }
  } catch (error) {
    return {
      tool_call_id: toolCall.id,
      content: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}
