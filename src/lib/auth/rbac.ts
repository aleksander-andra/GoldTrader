import type { APIContext } from "astro";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

interface Ok<T> {
  ok: true;
  value: T;
}
interface Err {
  ok: false;
  response: Response;
}

function unauthorized(message = "Unauthorized"): Err {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  };
}

function forbidden(message = "Forbidden"): Err {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
  };
}

function getBearerToken(context: APIContext): string | null {
  const authHeader = context.request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
}

export async function requireUser(context: APIContext): Promise<Ok<{ userId: string }> | Err> {
  const supabase = context.locals.supabase as SupabaseClient<Database> | undefined;
  if (!supabase) {
    return unauthorized("Supabase client not available");
  }

  const token = getBearerToken(context);
  if (!token) {
    return unauthorized("Missing bearer token");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return unauthorized("Invalid or expired token");
  }

  return { ok: true, value: { userId: data.user.id } };
}

export async function requireAdmin(context: APIContext): Promise<Ok<{ userId: string; role: "admin" }> | Err> {
  const userRes = await requireUser(context);
  if (!userRes.ok) return userRes;

  // Use a client authorized with the same bearer token to satisfy RLS during the role check
  const token = getBearerToken(context);
  const url = import.meta.env.SUPABASE_URL;
  const anon = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !anon || !token) {
    return forbidden("Cannot verify role");
  }
  const authed = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: profile, error: profileError } = await authed
    .from("profiles")
    .select("role")
    .eq("user_id", userRes.value.userId)
    .maybeSingle();

  if (profileError) {
    return forbidden("Cannot verify role");
  }
  if (!profile || profile.role !== "admin") {
    return forbidden("Admin role required");
  }

  return { ok: true, value: { userId: userRes.value.userId, role: "admin" } };
}
