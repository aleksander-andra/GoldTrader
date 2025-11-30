import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types";
import { requireAdmin } from "../../../lib/auth/rbac";
import { enforceDailyLimit } from "../../../lib/limits/daily";

export const prerender = false;

// POST /api/admin/generate-signals
// Body (opcjonalnie): { symbol?: string; count?: number }
export async function POST(context: APIContext) {
  const admin = await requireAdmin(context);
  if (!admin.ok) return admin.response;

  const daily = await enforceDailyLimit(context, "signals:generate", 20);
  if (!daily.ok) return daily.response;

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

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    // body opcjonalne – traktujemy brak jako {}
    body = {};
  }

  const { symbol, count } = (body as { symbol?: unknown; count?: unknown }) ?? {};
  const symbolStr = typeof symbol === "string" && symbol.trim() ? symbol.trim() : "XAUUSD";

  let countNum = 10;
  if (typeof count === "number" && Number.isFinite(count)) {
    countNum = Math.max(1, Math.min(50, Math.floor(count)));
  }

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  // 1) Znajdź aktywo
  const assetResult = await supabase.from("assets").select("id").eq("symbol", symbolStr).maybeSingle();
  const asset = assetResult.data as { id: string } | null;
  const assetError = assetResult.error;

  if (assetError) {
    return new Response(JSON.stringify({ error: assetError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!asset) {
    return new Response(JSON.stringify({ error: `Asset ${symbolStr} not found` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const assetId = asset.id;

  // 2) Upewnij się, że mamy strategię mock
  const stratResult = await supabase
    .from("strategies")
    .select("id")
    .eq("type", "mock")
    .eq("status", "active")
    .maybeSingle();
  const strat = stratResult.data as { id: string } | null;
  const stratError = stratResult.error;

  if (stratError) {
    return new Response(JSON.stringify({ error: stratError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let strategyId = strat?.id;
  if (!strategyId) {
    type StrategyInsert = Database["public"]["Tables"]["strategies"]["Insert"];
    const toInsert: StrategyInsert = {
      name: "Mock strategy",
      type: "mock",
      params_json: { version: "v1" },
      status: "active",
    };
    const payload = [toInsert] as unknown as StrategyInsert[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;
    const { data: created, error: createErr } = await supabaseAny
      .from("strategies")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (createErr || !created) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create strategy" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    strategyId = created.id;
  }

  if (!strategyId) {
    return new Response(JSON.stringify({ error: "Failed to resolve strategy id" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3) Wygeneruj mock sygnały
  const now = Date.now();
  const inserts: Database["public"]["Tables"]["signals"]["Insert"][] = [];

  for (let i = 0; i < countNum; i += 1) {
    const ts = new Date(now - i * 60 * 1000).toISOString(); // co minutę wstecz
    const r = Math.random();
    const type: "BUY" | "SELL" | "HOLD" = r < 0.45 ? "BUY" : r < 0.9 ? "SELL" : "HOLD";
    const confidence = 50 + Math.floor(Math.random() * 50); // 50–99

    inserts.push({
      strategy_id: strategyId,
      asset_id: assetId,
      ts,
      type,
      confidence,
      meta_json: {
        generated_by: "mock-strategy-v1",
        note: "Mock signal for MVP; do not trade.",
      },
    });
  }

  type SignalInsert = Database["public"]["Tables"]["signals"]["Insert"];
  const signalPayload = inserts as unknown as SignalInsert[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny2 = supabase as any;
  const { data: inserted, error: insertError } = await supabaseAny2
    .from("signals")
    .insert(signalPayload)
    .select("id, ts, type, confidence, asset_id, strategy_id");

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      generated: countNum,
      kept_top_k: inserted?.length ?? 0,
      items: inserted ?? [],
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }
  );
}
