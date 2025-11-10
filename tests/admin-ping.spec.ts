import { test, expect, request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.PUBLIC_SUPABASE_ANON_KEY;

async function getToken(email?: string, password?: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON || !email || !password) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return data.session.access_token;
}

test("401 without token", async ({ request }) => {
  const r = await request.get("/api/admin/ping");
  expect(r.status()).toBe(401);
});

test("403 with user token", async () => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASS || !SUPABASE_URL || !SUPABASE_ANON,
    "Missing E2E_USER_* or Supabase envs"
  );
  const token = await getToken(process.env.E2E_USER_EMAIL, process.env.E2E_USER_PASS);
  test.skip(!token, "Could not obtain user token");
  const ctx = await request.newContext({
    baseURL: process.env.APP_URL || "http://localhost:4321",
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  const r = await ctx.get("/api/admin/ping");
  expect(r.status()).toBe(403);
});

test("200 with admin token", async () => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASS || !SUPABASE_URL || !SUPABASE_ANON,
    "Missing E2E_ADMIN_* or Supabase envs"
  );
  const token = await getToken(process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASS);
  test.skip(!token, "Could not obtain admin token");
  const ctx = await request.newContext({
    baseURL: process.env.APP_URL || "http://localhost:4321",
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  const r = await ctx.get("/api/admin/ping");
  expect(r.status()).toBe(200);
  const json = await r.json();
  expect(json).toEqual({ ok: true });
});
