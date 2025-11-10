import type { PlaywrightTestConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local for E2E (if present)
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

const baseURL = process.env.APP_URL?.trim() || "http://localhost:4321";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL,
  },
  reporter: [["list"]],
  globalTeardown: "./tests/globalTeardown.ts",
};

export default config;
