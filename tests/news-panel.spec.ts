import { test, expect } from "@playwright/test";

test.describe("News & AI panel", () => {
  test("api /api/news/events returns items for XAUUSD", async ({ request }) => {
    const res = await request.get("/api/news/events?assetId=XAUUSD");
    expect(res.status()).toBe(200);

    const json = (await res.json()) as { items?: { id?: string; title?: string }[] };
    expect(Array.isArray(json.items)).toBe(true);
  });

  test("api /api/news/recommendation returns recommendation object", async ({ request }) => {
    const res = await request.get("/api/news/recommendation?assetId=XAUUSD");
    expect(res.status()).toBe(200);

    const json = (await res.json()) as {
      data?: { assetId?: string; decision?: string; confidence?: number };
    };

    expect(json.data).toBeDefined();
    expect(json.data?.assetId).toBe("XAUUSD");
    expect(["BUY", "SELL", "HOLD"]).toContain(json.data?.decision);
    expect(typeof json.data?.confidence).toBe("number");
  });

  test("dashboard shows news heading and recommendation card", async ({ page }) => {
    // Loguj użytkownika przed sprawdzeniem dashboardu
    const email = process.env.E2E_ADMIN_EMAIL || process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_ADMIN_PASS || process.env.E2E_USER_PASS;

    if (email && password) {
      await page.goto("/auth/login");
      await expect(page.getByTestId("login-form")).toHaveAttribute("data-hydrated", "true");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Hasło").fill(password);
      await page.getByRole("button", { name: /zaloguj/i }).click();
      await page.waitForURL("**/");
      await page.waitForTimeout(500); // Daj czas na załadowanie dashboardu
    } else {
      test.skip(true, "Missing E2E_ADMIN_EMAIL/E2E_ADMIN_PASS or E2E_USER_EMAIL/E2E_USER_PASS env");
    }

    await expect(page.getByRole("heading", { name: /wydarzenia wpływające na kurs/i })).toBeVisible();

    await expect(page.getByText(/AI rekomendacja|Rekomendacja niedostępna|Rekomendacja\b/)).toBeVisible();
  });
});
