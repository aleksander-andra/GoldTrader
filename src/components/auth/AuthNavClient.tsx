import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";

export function AuthNavClient() {
  const [hasUser, setHasUser] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setHasUser(false);
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        setHasUser(Boolean(data?.user));
      })
      .catch(() => {
        setHasUser(false);
      });
  }, []);

  return (
    <>
      {hasUser === false && (
        <>
          <a href="/auth/login" id="link-login" className="text-blue-600 hover:underline">
            Logowanie
          </a>
          <a href="/auth/register" id="link-register" className="text-blue-600 hover:underline">
            Rejestracja
          </a>
        </>
      )}
      {hasUser === true && (
        <>
          <a href="/profile" id="link-profile" className="text-blue-600 hover:underline">
            Profil
          </a>
          <a href="/auth/logout" id="link-logout" className="text-blue-600 hover:underline">
            Wyloguj
          </a>
        </>
      )}
    </>
  );
}
