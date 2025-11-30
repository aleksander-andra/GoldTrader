/* eslint-disable prettier/prettier */
import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../../components/ui/button";

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
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded px-3 py-2"
        required
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Hasło"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded px-3 py-2"
        required
        autoComplete="new-password"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {info && <p className="text-green-700 text-sm">{info}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Rejestracja..." : "Zarejestruj"}
      </Button>
    </form>
  );
}

