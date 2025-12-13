import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";
import type { SupabaseDbClient } from "../../../../db/supabase.client";
import { requireAdmin } from "../../../../lib/auth/rbac";
import { enforceDailyLimit } from "../../../../lib/limits/daily";
import { generateSignalsForAsset } from "../../../../lib/signals/generationService";
import { refreshAssetEvents } from "../../../../lib/news/newsRefreshService";

export const prerender = false;

// POST /api/admin/signals/refresh-and-generate
// Body (opcjonalnie):
// {
//   symbol?: string;
//   count?: number;
//   validForMinutes?: number;
//   lookbackMinutes?: number;
//   validFromOffsetMinutes?: number;
//   validToOffsetMinutes?: number;
// }
export async function POST(context: APIContext) {
  const admin = await requireAdmin(context);
  if (!admin.ok) return admin.response;

  const daily = await enforceDailyLimit(context, "signals:refresh-generate", 10);
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
    body = {};
  }

  const { symbol, count, validForMinutes, lookbackMinutes, validFromOffsetMinutes, validToOffsetMinutes } =
    (body as {
      symbol?: unknown;
      count?: unknown;
      validForMinutes?: unknown;
      lookbackMinutes?: unknown;
      validFromOffsetMinutes?: unknown;
      validToOffsetMinutes?: unknown;
    }) ?? {};

  const symbolStr = typeof symbol === "string" && symbol.trim() ? symbol.trim() : "XAUUSD";

  let countNum = 1;
  if (typeof count === "number" && Number.isFinite(count)) {
    countNum = Math.max(1, Math.min(50, Math.floor(count)));
  }

  let validMinutes = 60;
  if (typeof validForMinutes === "number" && Number.isFinite(validForMinutes)) {
    validMinutes = Math.max(5, Math.min(24 * 60, Math.floor(validForMinutes)));
  }

  let lookbackMins = 120;
  if (typeof lookbackMinutes === "number" && Number.isFinite(lookbackMinutes)) {
    lookbackMins = Math.max(validMinutes, Math.min(7 * 24 * 60, Math.floor(lookbackMinutes)));
  }

  let fromOffsetMins: number | undefined;
  if (typeof validFromOffsetMinutes === "number" && Number.isFinite(validFromOffsetMinutes)) {
    fromOffsetMins = Math.max(0, Math.min(7 * 24 * 60, Math.floor(validFromOffsetMinutes)));
  }

  let toOffsetMins: number | undefined;
  if (typeof validToOffsetMinutes === "number" && Number.isFinite(validToOffsetMinutes)) {
    const minTo = (fromOffsetMins ?? 0) + 5;
    toOffsetMins = Math.max(minTo, Math.min(7 * 24 * 60, Math.floor(validToOffsetMinutes)));
  }

  // Najpierw odśwież newsy dla wskazanego assetu (XAUUSD itp.).
  try {
    await refreshAssetEvents(symbolStr.toUpperCase());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh asset events before generating signals";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: authHeader } },
  }) as SupabaseDbClient;

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

  try {
    const result = await generateSignalsForAsset(supabase, {
      assetId,
      assetSymbol: symbolStr,
      maxSignals: countNum,
      validForMinutes: validMinutes,
      lookbackMinutes: lookbackMins,
      validFromOffsetMinutes: fromOffsetMins,
      validToOffsetMinutes: toOffsetMins,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        strategy: {
          id: result.strategy.id,
          name: result.strategy.name,
          type: result.strategy.type,
        },
        generated: result.inserted.length,
        items: result.inserted,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate signals";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
