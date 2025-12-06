import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Schematy dla narzędzi
const GetGoldPriceSchema = z.object({
  symbol: z.string().default("XAUUSD").describe("Symbol metalu szlachetnego (np. XAUUSD, XAUEUR)"),
  timeframe: z.enum(["1D", "1W", "1M"]).default("1D").describe("Okres czasu dla danych cenowych"),
});

const SearchFinancialNewsSchema = z.object({
  query: z.string().describe("Zapytanie do wyszukania wiadomości finansowych"),
  limit: z.number().min(1).max(10).default(5).describe("Maksymalna liczba wyników"),
});

// Główny serwer MCP
class GoldTraderMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: "goldtrader-mcp-server",
      version: "1.0.0",
    });

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // Lista dostępnych narzędzi
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_gold_price",
            description: "Pobiera aktualne ceny złota i innych metali szlachetnych",
            inputSchema: {
              type: "object",
              properties: {
                symbol: {
                  type: "string",
                  description: "Symbol metalu szlachetnego",
                  default: "XAUUSD",
                },
                timeframe: {
                  type: "string",
                  enum: ["1D", "1W", "1M"],
                  description: "Okres czasu dla danych cenowych",
                  default: "1D",
                },
              },
            },
          },
          {
            name: "search_financial_news",
            description: "Wyszukuje najnowsze wiadomości finansowe",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Zapytanie do wyszukania wiadomości finansowych",
                },
                limit: {
                  type: "number",
                  description: "Maksymalna liczba wyników",
                  default: 5,
                  minimum: 1,
                  maximum: 10,
                },
              },
              required: ["query"],
            },
          },
        ],
      };
    });

    // Obsługa wywołań narzędzi
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_gold_price":
            return await this.handleGetGoldPrice(args);
          case "search_financial_news":
            return await this.handleSearchFinancialNews(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  }

  private async handleGetGoldPrice(args: unknown) {
    const { symbol, timeframe } = GetGoldPriceSchema.parse(args);

    // Symulacja wywołania API finansowego
    // W rzeczywistości tutaj byłoby wywołanie prawdziwego API
    const mockData = {
      symbol,
      timeframe,
      price: Math.random() * 100 + 1800, // Symulowana cena złota
      timestamp: new Date().toISOString(),
      change: (Math.random() - 0.5) * 2, // Zmiana w procentach
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(mockData, null, 2),
        },
      ],
    };
  }

  private async handleSearchFinancialNews(args: unknown) {
    const { query, limit } = SearchFinancialNewsSchema.parse(args);

    // Symulacja wyszukiwania wiadomości
    const mockNews = Array.from({ length: limit }, (_, i) => ({
      title: `${query} - Ważna wiadomość ${i + 1}`,
      summary: `Podsumowanie wiadomości ${i + 1} na temat ${query}`,
      url: `https://example.com/news/${i + 1}`,
      publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(mockNews, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // eslint-disable-next-line no-console
    console.error("GoldTrader MCP Server running on stdio");
  }

  private async handleUnused() {
    // Helper method to satisfy linter - can be removed
  }
}

// Uruchomienie serwera
const server = new GoldTraderMCPServer();
server.run().catch(console.error);
