import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local like in playwright.config.ts
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

async function globalTeardown() {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const anon = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPass = process.env.E2E_ADMIN_PASS;

  if (!url || !anon || !adminEmail || !adminPass) {
    // Missing envs; nothing to do
    return;
  }

  try {
    const pub = createClient(url, anon);
    const { data: auth, error: authErr } = await pub.auth.signInWithPassword({
      email: adminEmail,
      password: adminPass,
    });
    if (authErr || !auth?.session?.access_token) {
      return;
    }
    const token = auth.session.access_token;

    const s = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Delete assets created by tests (prefix-based and by known names)
    const prefixes = ["AT%", "UT%", "PM%", "DM%"];
    for (const p of prefixes) {
      await s.from("assets").delete().ilike("symbol", p);
    }
    const names = ["Admin Test Asset", "User Test Asset", "Patch Me", "Delete Me"];
    for (const n of names) {
      await s.from("assets").delete().eq("name", n);
    }
  } catch {
    // Ignore teardown errors
  }
}

export default globalTeardown;
