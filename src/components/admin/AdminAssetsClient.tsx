import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../ui/button";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  currency: string;
}

type ViewState =
  | { status: "loading" }
  | { status: "not_logged_in" }
  | { status: "forbidden" }
  | { status: "ready"; assets: Asset[]; message?: string }
  | { status: "error"; message: string };

export function AdminAssetsClient() {
  const [state, setState] = React.useState<ViewState>({ status: "loading" });
  const [symbol, setSymbol] = React.useState("");
  const [name, setName] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function withAuth<T>(fn: (args: { token: string }) => Promise<T>): Promise<T | null> {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState({ status: "error", message: "Brak konfiguracji Supabase w przeglądarce." });
      return null;
    }
    console.log("withAuth supabase?", !!supabase);
    const { data, error } = await supabase.auth.getSession();
    console.log("session", !!data?.session, error?.message);
    if (error || !data?.session) {
      setState({ status: "not_logged_in" });
      return null;
    }
    return fn({ token: data.session.access_token });
  }

  const loadAssets = React.useCallback(async () => {
    setState({ status: "loading" });
    await withAuth(async ({ token }) => {
      const res = await fetch("/api/assets", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        setState({ status: "not_logged_in" });
        return;
      }
      if (res.status === 403) {
        setState({ status: "forbidden" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          status: "error",
          message: body?.error || `Nie udało się pobrać listy aktywów (${res.status}).`,
        });
        return;
      }
      const json = (await res.json()) as { items?: Asset[] };
      setState({ status: "ready", assets: json.items ?? [] });
    });
  }, []);

  React.useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim() || !name.trim() || !currency.trim()) {
      setState({ status: "error", message: "Uzupełnij symbol, nazwę i walutę." });
      return;
    }
    setSaving(true);
    await withAuth(async ({ token }) => {
      const payload = {
        symbol: symbol.trim(),
        name: name.trim(),
        currency: currency.trim(),
      };

      const url = editingId ? `/api/assets/${editingId}` : "/api/assets";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 403) {
        setState({ status: "forbidden" });
        setSaving(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          status: "error",
          message: body?.error || `Nie udało się zapisać aktywa (${res.status}).`,
        });
        setSaving(false);
        return;
      }

      setSymbol("");
      setName("");
      setCurrency("USD");
      setEditingId(null);
      await loadAssets();
      setSaving(false);
    });
  }

  async function handleEdit(asset: Asset) {
    setSymbol(asset.symbol);
    setName(asset.name);
    setCurrency(asset.currency);
    setEditingId(asset.id);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Na pewno usunąć to aktywo?")) return;
    setSaving(true);
    await withAuth(async ({ token }) => {
      const res = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        setState({
          status: "error",
          message: body?.error || `Nie udało się usunąć aktywa (${res.status}).`,
        });
        setSaving(false);
        return;
      }
      await loadAssets();
      setSaving(false);
    });
  }

  if (state.status === "loading") {
    return <p className="text-sm text-slate-600">Ładuję aktywa…</p>;
  }

  if (state.status === "not_logged_in") {
    return <p className="text-sm text-slate-600">Zaloguj się, aby zarządzać aktywami.</p>;
  }

  if (state.status === "forbidden") {
    return <p className="text-sm text-rose-700">Brak uprawnień. Tylko administrator może zarządzać aktywami.</p>;
  }

  if (state.status === "error") {
    return <p className="text-sm text-rose-700">Błąd: {state.message}</p>;
  }

  const { assets, message } = state;

  return (
    <section className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edytuj aktywo" : "Dodaj aktywo"}</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-4 items-end">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="asset-symbol">
              Symbol
            </label>
            <input
              id="asset-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="XAUUSD"
              required
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="asset-name">
              Nazwa
            </label>
            <input
              id="asset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="Złoto spot"
              required
            />
          </div>
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="asset-currency">
              Waluta
            </label>
            <input
              id="asset-currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              placeholder="USD"
              required
            />
          </div>
          <div className="flex gap-2 justify-end sm:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Zapisywanie..." : editingId ? "Zapisz zmiany" : "Dodaj"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditingId(null);
                  setSymbol("");
                  setName("");
                  setCurrency("USD");
                }}
              >
                Anuluj
              </Button>
            )}
          </div>
        </form>
        {message && <p className="text-xs text-slate-500">{message}</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Aktywa</h2>
        {assets.length === 0 ? (
          <p className="text-sm text-slate-600">Brak aktyw. Dodaj pierwsze aktywo powyżej.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4">Nazwa</th>
                  <th className="py-2 pr-4">Waluta</th>
                  <th className="py-2 pr-4 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50/80">
                    <td className="py-2 pr-4 font-mono text-xs text-slate-800">{a.symbol}</td>
                    <td className="py-2 pr-4 text-slate-800">{a.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{a.currency}</td>
                    <td className="py-2 pr-4 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleEdit(a)}
                          disabled={saving}
                        >
                          Edytuj
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(a.id)}
                          disabled={saving}
                        >
                          Usuń
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
