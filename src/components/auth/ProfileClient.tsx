import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import type { Database } from "../../db/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type State =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "error"; message: string }
  | { status: "ready"; email: string | null; role: string | null };

export function ProfileClient() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState({
        status: "error",
        message: "Brak konfiguracji PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY",
      });
      return;
    }

    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setState({
          status: "anon",
        });
        return;
      }

      const email = data.user.email ?? null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profileError) {
        setState({
          status: "error",
          message: profileError.message,
        });
        return;
      }

      const role = (profile as Pick<ProfileRow, "role"> | null)?.role ?? "user";

      setState({
        status: "ready",
        email,
        role,
      });
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : "Nie udało się pobrać profilu.";
      setState({ status: "error", message });
    });
  }, []);

  if (state.status === "loading") {
    return (
      <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        Ładuję profil użytkownika…
      </p>
    );
  }

  if (state.status === "anon") {
    return (
      <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
        Nie jesteś zalogowany. Zaloguj się, aby zobaczyć swój profil.
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
        Nie udało się wczytać profilu: {state.message}
      </p>
    );
  }

  const { email, role } = state;

  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div className="space-y-1">
        <dt className="text-slate-500">Email</dt>
        <dd className="font-medium text-slate-900">{email}</dd>
      </div>
      <div className="space-y-1">
        <dt className="text-slate-500">Rola</dt>
        <dd className="inline-flex items-center gap-2 font-medium text-slate-900">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            {role}
          </span>
          {role === "admin" && (
            <span className="text-xs text-emerald-600">Dostęp do panelu admina `/admin/assets`</span>
          )}
        </dd>
      </div>
      <div className="space-y-1 md:col-span-2">
        <dt className="text-slate-500">Plan</dt>
        <dd className="text-slate-700 text-sm">
          FREE (MVP) — wszyscy użytkownicy korzystają z jednego planu. Plany taryfowe (FREE / STANDARD / PRO) są
          przewidziane w kolejnych etapach (zob. PRD).
        </dd>
      </div>
    </dl>
  );
}
