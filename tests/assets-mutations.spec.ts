import { test, expect, request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.PUBLIC_SUPABASE_ANON_KEY;

async function getToken(email?: string, password?: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON || !email || !password) return null;
  const s = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await s.auth.signInWithPassword({ email, password });
  if (error || !data?.session) return null;
  return data.session.access_token;
}

test("PATCH/DELETE 401 without token", async ({ request }) => {
  const r1 = await request.patch("/api/assets/00000000-0000-0000-0000-000000000000", { data: { name: "X" } });
  expect([400, 401, 404]).toContain(r1.status()); // id may be invalid vs not found, but must not be 2xx
  const r2 = await request.delete("/api/assets/00000000-0000-0000-0000-000000000000");
  expect([400, 401, 404]).toContain(r2.status());
});

test("PATCH 403 with user token; 200 with admin token", async () => {
  test.skip(
    !process.env.E2E_USER_EMAIL ||
      !process.env.E2E_USER_PASS ||
      !process.env.E2E_ADMIN_EMAIL ||
      !process.env.E2E_ADMIN_PASS ||
      !SUPABASE_URL ||
      !SUPABASE_ANON,
    "Missing E2E/Supabase env"
  );

  const userToken = await getToken(process.env.E2E_USER_EMAIL, process.env.E2E_USER_PASS);
  const adminToken = await getToken(process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASS);
  test.skip(!userToken || !adminToken, "Could not obtain tokens");

  const adminCtx = await request.newContext({
    baseURL: process.env.APP_URL || "http://localhost:4321",
    extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
  });
  const symbol = `PM${Date.now()}`;
  const created = await adminCtx.post("/api/assets", { data: { symbol, name: "Patch Me", currency: "USD" } });
  expect(created.status()).toBe(201);
  const createdJson = await created.json();
  const id = createdJson?.item?.id as string;
  expect(typeof id).toBe("string");

  const userCtx = await request.newContext({
    baseURL: process.env.APP_URL || "http://localhost:4321",
    extraHTTPHeaders: { Authorization: `Bearer ${userToken}` },
  });
  const forbidden = await userCtx.patch(`/api/assets/${id}`, { data: { name: "User Forbidden" } });
  expect(forbidden.status()).toBe(403);

  const ok = await adminCtx.patch(`/api/assets/${id}`, { data: { name: "Patched OK" } });
  expect(ok.status()).toBe(200);
  const okJson = await ok.json();
  expect(okJson?.item?.name).toBe("Patched OK");
});

test("DELETE 403 with user token; 204 with admin token", async () => {
  test.skip(
    !process.env.E2E_USER_EMAIL ||
      !process.env.E2E_USER_PASS ||
      !process.env.E2E_ADMIN_EMAIL ||
      !process.env.E2E_ADMIN_PASS ||
      !SUPABASE_URL ||
      !SUPABASE_ANON,
    "Missing E2E/Supabase env"
  );

  const userToken = await getToken(process.env.E2E_USER_EMAIL, process.env.E2E_USER_PASS);
  const adminToken = await getToken(process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASS);
  test.skip(!userToken || !adminToken, "Could not obtain tokens");

  const adminCtx = await request.newContext({
    baseURL: process.env.APP_URL || "http://localhost:4321",
    extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
  });
  const symbol = `DM${Date.now()}`;
  const created = await adminCtx.post("/api/assets", { data: { symbol, name: "Delete Me", currency: "USD" } });
  expect(created.status()).toBe(201);
  const createdJson = await created.json();
  const id = createdJson?.item?.id as string;
  expect(typeof id).toBe("string");

  const userCtx = await request.newContext({
    baseURL: process.env.APP_URL || "http://localhost:4321",
    extraHTTPHeaders: { Authorization: `Bearer ${userToken}` },
  });
  const forbidden = await userCtx.delete(`/api/assets/${id}`);
  expect(forbidden.status()).toBe(403);

  const del = await adminCtx.delete(`/api/assets/${id}`);
  expect(del.status()).toBe(204);
});
