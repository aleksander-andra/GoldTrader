import type { NewsEventImpact } from "./newsTypes";
import type { NewsProvider } from "./newsProvider";

export class MockNewsProvider implements NewsProvider {
  async getEvents(assetId: string): Promise<NewsEventImpact[]> {
    if (assetId !== "XAUUSD") {
      return [];
    }

    const now = new Date();
    const iso = (offsetDays: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString();
    };

    return [
      {
        id: "mock-1",
        assetId,
        title: "Decyzja FED w sprawie stóp procentowych",
        description: "Rynek oczekuje utrzymania stóp procentowych, co zwykle wspiera stabilność wyceny złota.",
        date: iso(-1),
        direction: "neutral",
        strength: 5,
        source: "Mock",
      },
      {
        id: "mock-2",
        assetId,
        title: "Napięcia geopolityczne w regionie Bliskiego Wschodu",
        description: "Wzrost napięć geopolitycznych może zwiększać popyt na złoto jako bezpieczną przystań.",
        date: iso(-3),
        direction: "positive",
        strength: 8,
        source: "Mock",
      },
      {
        id: "mock-3",
        assetId,
        title: "Lepsze od oczekiwań dane z rynku pracy w USA",
        description: "Silne dane makro z USA mogą chwilowo osłabić popyt na złoto poprzez umocnienie dolara.",
        date: iso(-7),
        direction: "negative",
        strength: 6,
        source: "Mock",
      },
    ];
  }
}
