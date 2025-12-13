import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { LoginForm } from "./LoginForm";

interface DashboardGuardProps {
  children: React.ReactNode;
}

export function DashboardGuard({ children }: DashboardGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setIsAuthenticated(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setIsAuthenticated(!!session);
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-slate-600">Sprawdzanie autentykacji…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-center mb-6">Logowanie</h1>
        <LoginForm />
        <p className="text-center mt-4">
          Nie masz konta?{" "}
          <a href="/auth/register" className="text-blue-600 hover:underline">
            Zarejestruj się
          </a>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
