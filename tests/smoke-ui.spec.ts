import { test, expect } from "@playwright/test";

test("opens home page", async ({ page }) => {
  await page.goto("/");
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
