import { getSupabaseBrowser } from "../../lib/auth/browserClient";

(async () => {
  try {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    const login = document.getElementById("link-login");
    const register = document.getElementById("link-register");
    const logout = document.getElementById("link-logout");
    if (user) {
      login?.classList.add("hidden");
      register?.classList.add("hidden");
      logout?.classList.remove("hidden");
    } else {
      login?.classList.remove("hidden");
      register?.classList.remove("hidden");
      logout?.classList.add("hidden");
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
})();


