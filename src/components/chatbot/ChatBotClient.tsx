import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../ui/button";
import { Send, Loader2, TrendingUp, Bot, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatBotClient() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [streamingText, setStreamingText] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsThinking(true);
    setError(null);
    setStreamingText("");

    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = (await response.json()) as { message?: string; sessionId?: string };
      const aiMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message || "Brak odpowiedzi",
        timestamp: new Date(),
      };

      // Update sessionId if returned
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
      }

      // Simulate typing animation
      setIsThinking(false);
      const fullText = data.message || "Brak odpowiedzi";

      // Animate text appearing character by character
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setStreamingText(fullText.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          // Add final message after typing animation completes
          setTimeout(() => {
            setMessages((prev) => [...prev, aiMessage]);
            setStreamingText("");
          }, 300);
        }
      }, 20); // Adjust speed here (lower = faster, 20ms = ~50 chars/sec)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd";
      setError(errorMessage);
      setIsThinking(false);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Przepraszam, wystąpił błąd: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[600px] border border-slate-200 rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full blur-sm opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 p-2 rounded-full">
              <Bot className="size-5 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              Asystent GoldTrader
              <TrendingUp className="size-4 text-amber-600" />
            </h2>
            <p className="text-xs text-slate-600">Ekspert od tradingu i analizy rynkowej</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full blur-lg opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 p-4 rounded-full">
                  <Bot className="size-8 text-white" />
                </div>
              </div>
            </div>
            <p className="mb-2 font-medium text-slate-700">
              👋 Cześć! Jestem ekspertem od tradingu i asystentem GoldTrader.
            </p>
            <p className="text-slate-600">
              💬 <strong>Zadaj pytanie</strong>, a automatycznie pobiorę aktualne dane i przygotuję dla Ciebie
              szczegółową odpowiedź!
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Sprawdź panel po prawej stronie, aby zobaczyć wszystkie moje możliwości.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full blur-sm opacity-30" />
                  <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 p-2 rounded-full">
                    <Bot className="size-4 text-white" />
                  </div>
                </div>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-900 border border-slate-200 shadow-sm"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={`text-xs mt-2 ${msg.role === "user" ? "text-blue-100" : "text-slate-500"}`}>
                {msg.timestamp.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-br from-slate-200 to-slate-300 p-2 rounded-full">
                  <TrendingUp className="size-4 text-slate-600" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming text animation */}
        {streamingText && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full blur-sm opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 p-2 rounded-full">
                  <Bot className="size-4 text-white" />
                </div>
              </div>
            </div>
            <div className="max-w-[75%] rounded-lg px-4 py-2 bg-gradient-to-br from-slate-100 to-slate-50 text-slate-900 border border-slate-200 shadow-sm">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {streamingText}
                <span className="inline-block w-2 h-4 bg-amber-500 ml-1 animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {isThinking && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full blur-sm opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 p-2 rounded-full">
                  <Bot className="size-4 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg px-4 py-3 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <Sparkles className="size-4 text-amber-600 animate-pulse" style={{ animationDelay: "0s" }} />
                  <Sparkles className="size-4 text-amber-600 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <Sparkles className="size-4 text-amber-600 animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
                <span className="text-sm text-amber-700 font-medium">Analizuję dane...</span>
              </div>
            </div>
          </div>
        )}

        {isLoading && !isThinking && !streamingText && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full blur-sm opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 p-2 rounded-full">
                  <Bot className="size-4 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg px-4 py-2 border border-slate-200">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-amber-600" />
                <span className="text-sm text-slate-600">Przygotowuję odpowiedź...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        {error && <div className="mb-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</div>}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zadaj pytanie..."
            className="flex-1 min-h-[60px] max-h-[120px] rounded-md border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="self-end" size="sm">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
