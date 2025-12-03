/* eslint-disable no-undef, no-console */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local if present (for local development)
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.E2E_ADMIN_EMAIL;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

if (!adminEmail) {
  console.error("Missing E2E_ADMIN_EMAIL in environment.");
  process.exit(1);
}

// Service role client: bypasses RLS to manage users/profiles
const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  // 1) Find auth.user with the given email
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
    email: adminEmail,
  });

  if (usersError) {
    console.error("Failed to list users:", usersError.message);
    process.exit(1);
  }

  const user = users?.users?.[0];
  if (!user) {
    console.error(
      `No Supabase auth user found for ${adminEmail}. Create the user via app (register) before running this script.`
    );
    process.exit(1);
  }

  const userId = user.id;

  // 2) Upsert profile with role 'admin'
  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        role: "admin",
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("Failed to upsert admin profile:", upsertError.message);
    process.exit(1);
  }

  console.log(`Profile for ${adminEmail} set to role=admin (user_id=${userId}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error in seed-admin script:", err instanceof Error ? err.message : err);
  process.exit(1);
});


