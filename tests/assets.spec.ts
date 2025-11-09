import { test, expect, request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.PUBLIC_SUPABASE_ANON_KEY;

async function getUserToken() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASS;
  if (!email || !password) return null;
  const s = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await s.auth.signInWithPassword({ email, password });
  if (error || !data?.session) return null;
  return data.session.access_token;
}

test("assets 401 without token", async ({ request }) => {
  const r = await request.get("/api/assets");
  expect(r.status()).toBe(401);
});

test("assets list 200 with user token; by-id 200/404", async () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_ANON || !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASS,
    "Missing Supabase/E2E user env"
  );
  const token = await getUserToken();
  test.skip(!token, "Could not obtain user token");

  const ctx = await request.newContext({
    baseURL: process.env.APP_URL || "http://localhost:4321",
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  // list
  const list = await ctx.get("/api/assets");
  expect(list.status()).toBe(200);
  const payload = await list.json();
  const firstId: string | undefined = payload?.items?.[0]?.id;

  // by id (if present)
  if (firstId) {
    const byId = await ctx.get(`/api/assets/${firstId}`);
    expect(byId.status()).toBe(200);
    const item = await byId.json();
    expect(item).toHaveProperty("item");
  }

  // 404 random
  const r404 = await ctx.get("/api/assets/00000000-0000-0000-0000-000000000001");
  expect(r404.status()).toBe(404);
});
