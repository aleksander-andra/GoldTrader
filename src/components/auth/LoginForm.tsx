import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../../components/ui/button";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      return;
    }
    window.location.assign("/");
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
        autoComplete="current-password"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Logowanie..." : "Zaloguj"}
      </Button>
    </form>
  );
}
