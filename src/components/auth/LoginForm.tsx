import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../../components/ui/button";
import { TradingCard } from "../../components/ui/TradingCard";
import { Mail, Lock } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
    // eslint-disable-next-line no-console
    console.log("LoginForm hydrated");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log("LoginForm onSubmit fired", { email });
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Brak konfiguracji PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      // eslint-disable-next-line no-console
      console.error("Login error", error.message);
      return;
    }
    window.location.assign("/");
  }

  async function onResetPasswordClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email) {
      setError("Podaj adres email, aby zresetować hasło.");
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Brak konfiguracji PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setError(error.message);
      return;
    }

    setInfo("Jeśli konto istnieje, wysłaliśmy link do resetu hasła.");
  }

  return (
    <TradingCard variant="elevated">
      <form
        data-testid="login-form"
        data-hydrated={hydrated ? "true" : "false"}
        onSubmit={onSubmit}
        className="space-y-4"
      >
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
              autoComplete="current-password"
            />
          </div>
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

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
        >
          {loading ? "Logowanie..." : "Zaloguj się"}
        </Button>

        <button
          type="button"
          onClick={onResetPasswordClick}
          className="w-full text-sm text-amber-600 hover:text-amber-700 font-medium underline-offset-2 hover:underline transition-colors"
        >
          Nie pamiętasz hasła?
        </button>
      </form>
    </TradingCard>
  );
}
