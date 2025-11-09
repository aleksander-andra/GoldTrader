import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types";

export const prerender = false;

// GET /api/assets
export async function GET(context: APIContext) {
  const authHeader = context.request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = import.meta.env.SUPABASE_URL;
  const anon = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("symbol", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ items: data }), {
    headers: { "Content-Type": "application/json" },
  });
}

