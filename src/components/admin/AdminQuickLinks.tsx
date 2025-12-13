import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import type { Database } from "../../db/database.types";
import { Button } from "../ui/button";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface AdminQuickLinksState {
  status: "loading" | "not_admin" | "admin";
}

export function AdminQuickLinks() {
  const [state, setState] = React.useState<AdminQuickLinksState>({ status: "loading" });

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState({ status: "not_admin" });
      return;
    }

    supabase.auth
      .getUser()
      .then(async ({ data, error }) => {
        if (error || !data?.user) {
          setState({ status: "not_admin" });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        const role = (profile as Pick<ProfileRow, "role"> | null)?.role ?? "user";
        setState({ status: role === "admin" ? "admin" : "not_admin" });
      })
      .catch(() => {
        setState({ status: "not_admin" });
      });
  }, []);

  if (state.status === "loading") {
    return null;
  }

  if (state.status !== "admin") {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Panel admina:</span>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100"
      >
        <a href="/admin/signals">Sygnały</a>
      </Button>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100"
      >
        <a href="/admin/assets">Assets</a>
      </Button>
    </div>
  );
}
