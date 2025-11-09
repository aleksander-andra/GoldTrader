import { getSupabaseBrowser } from "../../lib/auth/browserClient";

(async () => {
  try {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } finally {
    window.location.assign("/");
  }
})();


