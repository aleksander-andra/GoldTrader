import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";

export function LogoutClient() {
  React.useEffect(() => {
    const supabase = getSupabaseBrowser();

    (async () => {
      try {
        if (supabase) {
          await supabase.auth.signOut();
        }
      } finally {
        window.location.assign("/");
      }
    })();
  }, []);

  return <p>Wylogowuję...</p>;
}
