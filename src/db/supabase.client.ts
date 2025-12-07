import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in dev if envs are missing
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

export type SupabaseDbClient = SupabaseClient<Database>;

export const supabaseClient: SupabaseDbClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
