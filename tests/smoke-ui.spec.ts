import { test, expect } from "@playwright/test";

async function loginAsUser(page: import("@playwright/test").Page) {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_ADMIN_PASS || process.env.E2E_USER_PASS;

  if (!email || !password) {
    test.skip(true, "Missing E2E_ADMIN_EMAIL/E2E_ADMIN_PASS or E2E_USER_EMAIL/E2E_USER_PASS env");
    return;
  }

  await page.goto("/auth/login");
  await expect(page.getByTestId("login-form")).toHaveAttribute("data-hydrated", "true");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Hasło").fill(password);
  await page.getByRole("button", { name: /zaloguj/i }).click();
  await page.waitForURL("**/");
  await page.waitForTimeout(500); // Daj czas na załadowanie dashboardu
}

test("opens home page", async ({ page }) => {
  await loginAsUser(page);
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});

test("opens login page", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("button", { name: /zaloguj/i })).toBeVisible();
});

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json).toMatchObject({ status: "ok" });
});
