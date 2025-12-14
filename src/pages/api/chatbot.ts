import type { APIContext } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import { requireUser } from "../../lib/auth/rbac";
import { enforceDailyLimit } from "../../lib/limits/daily";

export const prerender = false;

const OPENAI_API_KEY = (typeof process !== "undefined" && process.env.OPENAI_API_KEY) || import.meta.env.OPENAI_API_KEY;

const OPENAI_MODEL =
  (typeof process !== "undefined" && process.env.OPENAI_MODEL) || import.meta.env.OPENAI_MODEL || "gpt-4o-mini";

const OPENAI_MAX_TOKENS =
  (typeof process !== "undefined" && process.env.OPENAI_MAX_TOKENS_PER_CALL) ||
  import.meta.env.OPENAI_MAX_TOKENS_PER_CALL ||
  "1000";

// Base system prompt (will be enhanced with user context)
const BASE_SYSTEM_PROMPT = `Jesteś asystentem systemu GoldTrader - webowej aplikacji inwestycyjnej z sygnałami tradingowymi dla XAUUSD (złoto).

## Twoje zadania:
- Wyjaśniaj użytkownikom, co oznaczają sygnały tradingowe (BUY/SELL/HOLD)
- Objaśniaj cykl życia sygnału: candidate → accepted/rejected → expired
- Wyjaśniaj role użytkownika i admina
- Pomagaj interpretować parametry: ważność od–do (valid_from/valid_to), confidence (0-100%)
- Wyjaśniaj jak działa baseline forecast i backtest
- Pomagaj zrozumieć metryki jakości modelu

## Ważne informacje o systemie:

### Sygnały tradingowe:
- **Status**: candidate (kandydat) → accepted (zaakceptowany) → expired (wygasły) lub rejected (odrzucony)
- **Type**: BUY (kupno), SELL (sprzedaż), HOLD (trzymaj)
- **Confidence**: 0-100% - pewność sygnału
- **Valid from/to**: przedział czasowy, w którym sygnał jest ważny
- **Forecast price**: cena prognozowana w momencie generowania
- **Realized price**: cena zrealizowana po zakończeniu ważności
- **Hit**: czy prognoza była poprawna (true/false)

### Role:
- **User**: widzi tylko zaakceptowane i aktualnie ważne sygnały
- **Admin**: może generować kandydatów, akceptować/odrzucać sygnały, zarządzać aktywami

### Baseline forecast:
- Prosty model kierunkowy dla XAUUSD (UP/DOWN/FLAT)
- Pracuje na dziennych danych z price_history
- Accuracy pokazuje trafność kierunku w oknie (np. 90 dni)

Odpowiadaj krótko, zwięźle i pomocnie. Jeśli nie znasz odpowiedzi, powiedz to szczerze.`;

/**
 * Builds system prompt with user context (role, active signals)
 */
async function buildSystemPromptWithContext(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string
): Promise<string> {
  // Get user role
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle();
  const role = profile?.role || "user";

  // Get active signals for the user
  const nowIso = new Date().toISOString();
  const { data: signals } = await supabase
    .from("signals")
    .select("id, type, confidence, valid_from, valid_to, strategy_id, asset_id")
    .eq("status", "accepted")
    .gt("valid_to", nowIso)
    .order("valid_from", { ascending: true })
    .limit(10);

  let contextSection = `\n## Kontekst użytkownika:\n`;
  contextSection += `- **Rola**: ${role === "admin" ? "Administrator" : "Użytkownik"}\n`;

  if (signals && signals.length > 0) {
    contextSection += `- **Aktywne sygnały** (${signals.length}):\n`;
    for (const signal of signals.slice(0, 5)) {
      // Get asset symbol
      const { data: asset } = await supabase.from("assets").select("symbol").eq("id", signal.asset_id).maybeSingle();
      const symbol = asset?.symbol || "?";

      // Get strategy name
      const { data: strategy } = await supabase
        .from("strategies")
        .select("name")
        .eq("id", signal.strategy_id)
        .maybeSingle();
      const strategyName = strategy?.name || "?";

      const validFrom = signal.valid_from ? new Date(signal.valid_from).toLocaleString("pl-PL") : "?";
      const validTo = signal.valid_to ? new Date(signal.valid_to).toLocaleString("pl-PL") : "?";

      contextSection += `  - ${signal.type} dla ${symbol} (pewność: ${signal.confidence}%, strategia: ${strategyName}, ważny: ${validFrom} - ${validTo})\n`;
    }
    if (signals.length > 5) {
      contextSection += `  - ... i ${signals.length - 5} więcej\n`;
    }
  } else {
    contextSection += `- **Aktywne sygnały**: brak\n`;
  }

  return BASE_SYSTEM_PROMPT + contextSection;
}

/**
 * Gets or creates a chat session for the user
 */
async function getOrCreateSession(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  sessionId?: string
): Promise<string> {
  if (sessionId) {
    // Verify session belongs to user
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (session) {
      return sessionId;
    }
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to create chat session:", error);
    throw new Error(`Failed to create chat session: ${error.message}`);
  }

  if (!newSession) {
    throw new Error("Failed to create chat session: no data returned");
  }

  return newSession.id;
}

/**
 * Gets chat history for a session
 */
async function getChatHistory(
  supabase: ReturnType<typeof createClient<Database>>,
  sessionId: string
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(20); // Last 20 messages for context

  if (!messages) {
    return [];
  }

  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Saves a message to the database
 */
async function saveMessage(
  supabase: ReturnType<typeof createClient<Database>>,
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to save message:", error);
    // Don't throw - message saving is not critical, but log the error
    // This might indicate missing migration or RLS policy issue
  }

  // Update session title if it's the first user message
  if (role === "user") {
    const { data: existingMessages } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("session_id", sessionId)
      .eq("role", "user")
      .limit(1);

    if (existingMessages && existingMessages.length === 1) {
      // First user message - use it as title (truncated to 50 chars)
      const title = content.length > 50 ? content.slice(0, 47) + "..." : content;
      await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
    }
  }
}

/**
 * POST /api/chatbot
 *
 * Endpoint chatbota dla GoldTrader.
 * Wymaga autoryzacji (użytkownik musi być zalogowany).
 *
 * Body: { message: string, sessionId?: string }
 */
export async function POST(context: APIContext) {
  // Rate limiting: 50 messages per day per user
  const limit = await enforceDailyLimit(context, "chatbot:messages", 50);
  if (!limit.ok) {
    return limit.response;
  }

  // Wymagaj autoryzacji
  const userRes = await requireUser(context);
  if (!userRes.ok) {
    return userRes.response;
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "Chatbot is not configured. OPENAI_API_KEY is missing.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

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

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, sessionId } = body as { message?: unknown; sessionId?: unknown };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: "message is required and must be a non-empty string" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validSessionId = typeof sessionId === "string" && sessionId.trim().length > 0 ? sessionId : undefined;

  try {
    // Get or create session
    const currentSessionId = await getOrCreateSession(supabase, userRes.value.userId, validSessionId);

    // Save user message
    await saveMessage(supabase, currentSessionId, "user", message.trim());

    // Get chat history
    const history = await getChatHistory(supabase, currentSessionId);

    // Build system prompt with user context
    const systemPrompt = await buildSystemPromptWithContext(supabase, userRes.value.userId);

    // Build messages array for OpenAI
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add history (excluding the just-saved user message to avoid duplication)
    const historyWithoutLast = history.slice(0, -1);
    for (const msg of historyWithoutLast) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current user message
    messages.push({ role: "user", content: message.trim() });

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: Number.isFinite(Number(OPENAI_MAX_TOKENS)) ? Number(OPENAI_MAX_TOKENS) : 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      // eslint-disable-next-line no-console
      console.error("OpenAI API error:", response.status, errorBody);
      return new Response(
        JSON.stringify({
          error: "Failed to get response from AI",
          details: response.status === 401 ? "Invalid API key" : "API error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (data.error) {
      return new Response(
        JSON.stringify({
          error: data.error.message || "AI service error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      return new Response(
        JSON.stringify({
          error: "No response from AI",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Save assistant message
    await saveMessage(supabase, currentSessionId, "assistant", aiMessage);

    return new Response(
      JSON.stringify({
        message: aiMessage,
        sessionId: currentSessionId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
