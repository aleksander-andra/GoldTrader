import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import type { Database } from "../../db/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface NavState {
  status: "loading" | "anon" | "user";
  role: ProfileRow["role"] | null;
}

export function AuthNavClient() {
  const [state, setState] = React.useState<NavState>({ status: "loading", role: null });

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState({ status: "anon", role: null });
      return;
    }

    supabase.auth
      .getUser()
      .then(async ({ data, error }) => {
        if (error || !data?.user) {
          setState({ status: "anon", role: null });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        const role = (profile as Pick<ProfileRow, "role"> | null)?.role ?? "user";
        setState({ status: "user", role });
      })
      .catch(() => {
        setState({ status: "anon", role: null });
      });
  }, []);

  const { status, role } = state;

  return (
    <>
      {status !== "user" && (
        <>
          <a href="/auth/login" id="link-login" className="text-blue-600 hover:underline">
            Logowanie
          </a>
          <a href="/auth/register" id="link-register" className="text-blue-600 hover:underline">
            Rejestracja
          </a>
        </>
      )}
      {status === "user" && (
        <>
          {role === "admin" ? (
            <a href="/profile" id="link-profile" className="text-blue-600 hover:underline">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 border border-emerald-300">
                admin
              </span>
            </a>
          ) : (
            <a href="/profile" id="link-profile" className="text-blue-600 hover:underline">
              Twoje konto
            </a>
          )}
          <a href="/auth/logout" id="link-logout" className="text-blue-600 hover:underline">
            Wyloguj
          </a>
        </>
      )}
    </>
  );
}
