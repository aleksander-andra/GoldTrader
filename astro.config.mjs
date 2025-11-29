// @ts-check
/* eslint-env node */
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel/server";

const isVercel = process.env.VERCEL === "1";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 4321 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: isVercel
    ? vercel({
        runtime: "nodejs22.x",
      })
    : node({
        mode: "standalone",
      }),
});
