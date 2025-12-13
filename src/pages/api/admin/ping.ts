import type { APIContext } from "astro";
import { requireAdmin } from "../../../lib/auth/rbac";

export const prerender = false;

export async function GET(context: APIContext) {
  const adminRes = await requireAdmin(context);
  if (!adminRes.ok) return adminRes.response;
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
