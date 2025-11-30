import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../../components/ui/button";

export function ResetPasswordForm() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!password || password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    if (password !== confirm) {
      setError("Hasła nie są takie same.");
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Brak konfiguracji PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setInfo("Hasło zostało zmienione. Możesz się teraz zalogować.");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto space-y-3">
      <input
        type="password"
        placeholder="Nowe hasło"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded px-3 py-2"
        required
        autoComplete="new-password"
      />
      <input
        type="password"
        placeholder="Powtórz hasło"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full border rounded px-3 py-2"
        required
        autoComplete="new-password"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {info && <p className="text-green-700 text-sm">{info}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Zapisywanie..." : "Zapisz nowe hasło"}
      </Button>
    </form>
  );
}
