import type { PlaywrightTestConfig } from "@playwright/test";

const baseURL =
  process.env.APP_URL?.trim() ||
  "http://localhost:4321";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL,
  },
  reporter: [["list"]],
};

export default config;


