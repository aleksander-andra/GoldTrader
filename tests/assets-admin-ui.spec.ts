import { test, expect } from "@playwright/test";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASS;

  test.skip(!email || !password, "Missing E2E_ADMIN_EMAIL / E2E_ADMIN_PASS env");

  page.on("console", (msg) => {
    // eslint-disable-next-line no-console
    console.log("PW console:", msg.type(), msg.text());
  });

  await page.goto("/auth/login");
  await expect(page.getByTestId("login-form")).toHaveAttribute("data-hydrated", "true");
  await page.screenshot({ path: "debug-login.png", fullPage: true });
  await page.getByPlaceholder("Email").fill(email ?? "");
  await page.getByPlaceholder("Hasło").fill(password ?? "");
  await page.screenshot({ path: "debug-login-filled.png", fullPage: true });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /zaloguj/i }).click();
  await page.waitForURL("**/");
  await page.screenshot({ path: "debug-after-login.png", fullPage: true });
}

test("admin can manage asset via UI", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/assets");

  const uniqueSymbol = `UI${Date.now()}`;
  await page.screenshot({ path: "debug-admin-assets.png", fullPage: true });
  await page.getByLabel("Symbol").fill(uniqueSymbol);
  await page.getByLabel("Nazwa").fill("UI Test Asset");
  await page.getByLabel("Waluta").fill("USD");

  await page.getByRole("button", { name: "Dodaj" }).click();

  const row = page.getByRole("row", { name: new RegExp(uniqueSymbol) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("UI Test Asset");

  await row.getByRole("button", { name: "Edytuj" }).click();
  await page.getByLabel("Nazwa").fill("UI Test Asset Updated");
  await page.getByRole("button", { name: "Zapisz zmiany" }).click();

  await expect(row).toContainText("UI Test Asset Updated");

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await row.getByRole("button", { name: "Usuń" }).click();

  await expect(page.getByRole("row", { name: new RegExp(uniqueSymbol) })).toHaveCount(0);
});
