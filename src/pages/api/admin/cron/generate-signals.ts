import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types";
import type { SupabaseDbClient } from "../../../../db/supabase.client";
import { generateSignalsForAsset } from "../../../../lib/signals/generationService";

export const prerender = false;

/**
 * GET/POST /api/admin/cron/generate-signals
 *
 * Dedykowany endpoint dla Vercel Cron Jobs.
 * Używa SUPABASE_SERVICE_ROLE_KEY zamiast tokena użytkownika.
 * Zabezpieczony przez X-CRON-SECRET header.
 *
 * Body (POST) lub query params (GET, opcjonalnie): { symbol?: string; validFromOffsetMinutes?: number; validToOffsetMinutes?: number; lookbackMinutes?: number }
 */
async function handleRequest(context: APIContext) {
  // Weryfikuj secret header
  const cronSecret = context.request.headers.get("x-cron-secret");
  const expectedSecret = import.meta.env.CRON_SECRET;

  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Invalid or missing X-CRON-SECRET" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Użyj service role key zamiast tokena użytkownika
  const url = import.meta.env.SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pobierz parametry z body (POST) lub query string (GET)
  let params: {
    symbol?: unknown;
    validFromOffsetMinutes?: unknown;
    validToOffsetMinutes?: unknown;
    lookbackMinutes?: unknown;
  } = {};

  if (context.request.method === "POST") {
    try {
      const body = await context.request.json();
      params = (body as typeof params) ?? {};
    } catch {
      // body opcjonalne
    }
  } else {
    // GET - pobierz z query string
    const url = new URL(context.request.url);
    const symbolParam = url.searchParams.get("symbol");
    const fromParam = url.searchParams.get("validFromOffsetMinutes");
    const toParam = url.searchParams.get("validToOffsetMinutes");
    const lookbackParam = url.searchParams.get("lookbackMinutes");

    if (symbolParam) params.symbol = symbolParam;
    if (fromParam) params.validFromOffsetMinutes = Number(fromParam);
    if (toParam) params.validToOffsetMinutes = Number(toParam);
    if (lookbackParam) params.lookbackMinutes = Number(lookbackParam);
  }

  const { symbol, validFromOffsetMinutes, validToOffsetMinutes, lookbackMinutes } = params;

  const symbolStr = typeof symbol === "string" && symbol.trim() ? symbol.trim() : "XAUUSD";

  // Domyślne wartości dla cron job:
  // - validFromOffsetMinutes: 0 (od teraz)
  // - validToOffsetMinutes: 60 (do +60 minut)
  // - lookbackMinutes: 240 (ostatnie 4 godziny)
  const fromOffset =
    typeof validFromOffsetMinutes === "number" && Number.isFinite(validFromOffsetMinutes)
      ? Math.max(0, Math.min(7 * 24 * 60, Math.floor(validFromOffsetMinutes)))
      : 0;

  const toOffset =
    typeof validToOffsetMinutes === "number" && Number.isFinite(validToOffsetMinutes)
      ? Math.max(fromOffset + 5, Math.min(7 * 24 * 60, Math.floor(validToOffsetMinutes)))
      : fromOffset + 60;

  const lookbackMins =
    typeof lookbackMinutes === "number" && Number.isFinite(lookbackMinutes)
      ? Math.max(toOffset - fromOffset, Math.min(7 * 24 * 60, Math.floor(lookbackMinutes)))
      : 240;

  // Utwórz klienta z service role key (bypassuje RLS)
  const supabase = createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseDbClient;

  // Znajdź aktywo
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

  try {
    const result = await generateSignalsForAsset(supabase, {
      assetId: asset.id,
      assetSymbol: symbolStr,
      maxSignals: 1, // Cron generuje 1 sygnał na wywołanie
      validForMinutes: toOffset - fromOffset,
      lookbackMinutes: lookbackMins,
      validFromOffsetMinutes: fromOffset,
      validToOffsetMinutes: toOffset,
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
        symbol: symbolStr,
        validFromOffsetMinutes: fromOffset,
        validToOffsetMinutes: toOffset,
        lookbackMinutes: lookbackMins,
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

// GET handler - wywołuje tę samą logikę co POST
export async function GET(context: APIContext) {
  return handleRequest(context);
}

// POST handler - wywołuje tę samą logikę
export async function POST(context: APIContext) {
  return handleRequest(context);
}
