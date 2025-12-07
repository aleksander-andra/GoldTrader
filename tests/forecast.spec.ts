import { test, expect } from "@playwright/test";

test.describe("Forecast engine (baseline)", () => {
  test("api /api/forecast/xauusd returns baseline forecast object", async ({ request }) => {
    const res = await request.get("/api/forecast/xauusd");
    expect(res.status()).toBe(200);

    const json = (await res.json()) as {
      data?: {
        asset?: string;
        timeframe?: string;
        horizon?: string;
        decision?: "UP" | "DOWN" | "FLAT" | string;
        confidence?: number;
      };
    };

    expect(json.data).toBeDefined();
    expect(json.data?.asset).toBe("XAUUSD");
    expect(json.data?.timeframe).toBe("1d");
    expect(json.data?.horizon).toBe("1d");
    expect(["UP", "DOWN", "FLAT"]).toContain(json.data?.decision);
    expect(typeof json.data?.confidence).toBe("number");
  });

  test("api /api/admin/forecast/baseline-metrics returns backtest metrics", async ({ request }) => {
    const res = await request.get("/api/admin/forecast/baseline-metrics?windowDays=30");
    expect(res.status()).toBe(200);

    const json = (await res.json()) as {
      windowDays?: number;
      totalSamples?: number;
      correct?: number;
      accuracy?: number;
    };

    expect(json.windowDays).toBe(30);
    expect(typeof json.totalSamples).toBe("number");
    expect(typeof json.correct).toBe("number");
    expect(typeof json.accuracy).toBe("number");

    if (typeof json.totalSamples === "number" && typeof json.correct === "number") {
      expect(json.totalSamples).toBeGreaterThanOrEqual(0);
      expect(json.correct).toBeGreaterThanOrEqual(0);
      expect(json.correct).toBeLessThanOrEqual(json.totalSamples);
    }

    if (typeof json.accuracy === "number") {
      expect(json.accuracy).toBeGreaterThanOrEqual(0);
      expect(json.accuracy).toBeLessThanOrEqual(100);
    }
  });
});
