import { test, expect } from "@playwright/test";

test("playwright browser can reach public internet", async ({ page }) => {
  await page.goto("https://www.google.com", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/https:\/\/www\.google\.com/);
});
