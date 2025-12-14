/* eslint-disable prettier/prettier */
import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../../components/ui/button";
import { TradingCard } from "../../components/ui/TradingCard";
import { Mail, Lock } from "lucide-react";

export function RegisterForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Brak konfiguracji PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("Użytkownik z takim adresem email już istnieje. Spróbuj się zalogować lub użyj resetu hasła.");
      } else {
        setError(error.message);
      }
      return;
    }
    setInfo("Jeśli ten adres nie był wcześniej zarejestrowany, konto zostało utworzone. Sprawdź email (jeśli wymagane) i zaloguj się.");
  }

  return (
    <TradingCard variant="elevated">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <input
              id="email"
              type="email"
              placeholder="twoj@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Hasło
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              required
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-slate-500">Minimum 6 znaków</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {info && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{info}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700">
          {loading ? "Rejestracja..." : "Utwórz konto"}
        </Button>
      </form>
    </TradingCard>
  );
}

