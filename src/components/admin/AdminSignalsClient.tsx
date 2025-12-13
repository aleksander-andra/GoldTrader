import React from "react";
import { getSupabaseBrowser } from "../../lib/auth/browserClient";
import { Button } from "../ui/button";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  currency: string;
}

interface SignalCandidate {
  id: string;
  asset_id: string;
  type: "BUY" | "SELL" | "HOLD";
  confidence: number;
  status: "candidate" | "accepted" | "rejected" | "expired" | null;
  valid_from: string | null;
  valid_to: string | null;
  strategies?: {
    name?: string | null;
    type?: string | null;
  } | null;
  assets?: {
    symbol?: string | null;
  } | null;
}

type ViewState =
  | { status: "loading" }
  | { status: "not_logged_in" }
  | { status: "forbidden" }
  | { status: "ready"; assets: Asset[]; candidates: SignalCandidate[] }
  | { status: "error"; message: string };

export function AdminSignalsClient() {
  const [state, setState] = React.useState<ViewState>({ status: "loading" });

  const [genSymbol, setGenSymbol] = React.useState<string>("XAUUSD");
  const [genStrategy, setGenStrategy] = React.useState<string>("baseline_v1");
  const [genFromAt, setGenFromAt] = React.useState<string>("");
  const [genToAt, setGenToAt] = React.useState<string>("");
  const [genLookbackMinutes, setGenLookbackMinutes] = React.useState<number>(240);

  const [generating, setGenerating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [syncingHistory, setSyncingHistory] = React.useState(false);
  const [signalsMessage, setSignalsMessage] = React.useState<string | null>(null);
  const [signalsError, setSignalsError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function withAuth<T>(fn: (args: { token: string }) => Promise<T>): Promise<T | null> {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState({ status: "error", message: "Brak konfiguracji Supabase w przeglądarce." });
      return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) {
      setState({ status: "not_logged_in" });
      return null;
    }

    return fn({ token: data.session.access_token });
  }

  const loadAssetsAndCandidates = React.useCallback(async () => {
    setState({ status: "loading" });
    await withAuth(async ({ token }) => {
      const [assetsRes, candidatesRes] = await Promise.all([
        fetch("/api/assets", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/signals/candidates?symbol=${encodeURIComponent(genSymbol || "XAUUSD")}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (assetsRes.status === 401 || candidatesRes.status === 401) {
        setState({ status: "not_logged_in" });
        return;
      }
      if (assetsRes.status === 403 || candidatesRes.status === 403) {
        setState({ status: "forbidden" });
        return;
      }

      if (!assetsRes.ok) {
        const body = await assetsRes.json().catch(() => ({}));
        setState({
          status: "error",
          message: body?.error || `Nie udało się pobrać listy aktywów (${assetsRes.status}).`,
        });
        return;
      }

      if (!candidatesRes.ok) {
        const body = await candidatesRes.json().catch(() => ({}));
        setState({
          status: "error",
          message: body?.error || `Nie udało się pobrać kandydatów sygnałów (${candidatesRes.status}).`,
        });
        return;
      }

      const assetsJson = (await assetsRes.json()) as { items?: Asset[] };
      const candidatesJson = (await candidatesRes.json()) as { items?: SignalCandidate[] };

      const assets = assetsJson.items ?? [];
      const symbolToUse = genSymbol || assets[0]?.symbol || "XAUUSD";

      if (!genSymbol && assets.length > 0) {
        setGenSymbol(symbolToUse);
      }

      // Jeśli nie ustawiono zakresu dat, ustaw domyślnie: od teraz do +60 minut.
      if (!genFromAt || !genToAt) {
        const now = new Date();
        const in60 = new Date(now.getTime() + 60 * 60 * 1000);
        const toLocal = (d: Date) => {
          const pad = (n: number) => n.toString().padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
            d.getMinutes()
          )}`;
        };
        setGenFromAt(toLocal(now));
        setGenToAt(toLocal(in60));
      }

      setState({
        status: "ready",
        assets,
        candidates: candidatesJson.items ?? [],
      });
    });
  }, [genSymbol, genFromAt, genToAt]);

  React.useEffect(() => {
    void loadAssetsAndCandidates();
  }, [loadAssetsAndCandidates]);

  async function handleGenerateSignals() {
    setSignalsError(null);
    setSignalsMessage(null);
    setGenerating(true);

    const symbolToUse = (genSymbol || "XAUUSD").trim();
    if (!symbolToUse) {
      setSignalsError("Wybierz aktywo, dla którego chcesz wygenerować sygnały.");
      setGenerating(false);
      return;
    }

    if (!genFromAt || !genToAt) {
      setSignalsError("Ustaw zarówno datę/czas OD jak i DO.");
      setGenerating(false);
      return;
    }

    const nowMs = Date.now();
    const fromDate = new Date(genFromAt);
    const toDate = new Date(genToAt);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setSignalsError("Nieprawidłowy format daty/czasu.");
      setGenerating(false);
      return;
    }

    let safeFrom = Math.round((fromDate.getTime() - nowMs) / (60 * 1000));
    let safeTo = Math.round((toDate.getTime() - nowMs) / (60 * 1000));

    // Przedział w minutach od teraz – ograniczamy do 0..7 dni.
    safeFrom = Math.max(0, Math.min(7 * 24 * 60, safeFrom));
    safeTo = Math.max(0, Math.min(7 * 24 * 60, safeTo));

    if (safeTo <= safeFrom + 4) {
      safeTo = safeFrom + 5;
    }

    const windowMinutes = safeTo - safeFrom;

    const safeLookback = Number.isFinite(genLookbackMinutes)
      ? Math.max(windowMinutes, Math.min(7 * 24 * 60, Math.floor(genLookbackMinutes)))
      : Math.max(windowMinutes, 240);

    await withAuth(async ({ token }) => {
      const res = await fetch("/api/admin/generate-signals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbolToUse,
          strategyId: genStrategy,
          validFromOffsetMinutes: safeFrom,
          validToOffsetMinutes: safeTo,
          lookbackMinutes: safeLookback,
        }),
      });

      if (res.status === 401) {
        setState({ status: "not_logged_in" });
        setGenerating(false);
        return;
      }

      if (res.status === 403) {
        setState({ status: "forbidden" });
        setGenerating(false);
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        generated?: number;
        strategy?: { name?: string | null; type?: string | null };
      };

      if (!res.ok || body.ok !== true) {
        setSignalsError(body.error || `Nie udało się wygenerować sygnałów (${res.status}).`);
        setGenerating(false);
        return;
      }

      const count = body.generated ?? 0;
      const stratName = body.strategy?.name ?? "baseline";
      setSignalsMessage(
        `Wygenerowano ${count} sygnał(ów) dla ${symbolToUse} (strategia: ${stratName}, przedział ${safeFrom}–${safeTo} min od teraz, okno historii ${safeLookback} min).`
      );
      setGenerating(false);

      await loadAssetsAndCandidates();
    });
  }

  async function handleSyncPriceHistory() {
    setSignalsError(null);
    setSignalsMessage(null);
    setSyncingHistory(true);

    await withAuth(async ({ token }) => {
      const symbolToUse = (genSymbol || "XAUUSD").trim().toUpperCase();
      const res = await fetch("/api/admin/price-history/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol: symbolToUse }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        symbol?: string;
        inserted?: number;
        error?: string;
      };

      if (!res.ok || body.ok !== true) {
        setSignalsError(body.error || `Nie udało się zaktualizować historii cen (${res.status}).`);
        setSyncingHistory(false);
        return;
      }

      const inserted = body.inserted ?? 0;
      const syncedSymbol = body.symbol ?? symbolToUse;
      setSignalsMessage(
        `Zsynchronizowano historię ceny ${syncedSymbol} (dodano/zaktualizowano ${inserted} rekordów w price_history).`
      );
      setSyncingHistory(false);
    });
  }

  async function handleRefreshAndGenerate() {
    setSignalsError(null);
    setSignalsMessage(null);
    setRefreshing(true);

    const symbolToUse = (genSymbol || "XAUUSD").trim();
    if (!symbolToUse) {
      setSignalsError("Wybierz aktywo, dla którego chcesz wygenerować sygnały.");
      setRefreshing(false);
      return;
    }

    if (!genFromAt || !genToAt) {
      setSignalsError("Ustaw zarówno datę/czas OD jak i DO.");
      setRefreshing(false);
      return;
    }

    const nowMs = Date.now();
    const fromDate = new Date(genFromAt);
    const toDate = new Date(genToAt);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setSignalsError("Nieprawidłowy format daty/czasu.");
      setRefreshing(false);
      return;
    }

    let safeFrom = Math.round((fromDate.getTime() - nowMs) / (60 * 1000));
    let safeTo = Math.round((toDate.getTime() - nowMs) / (60 * 1000));

    safeFrom = Math.max(0, Math.min(7 * 24 * 60, safeFrom));
    safeTo = Math.max(0, Math.min(7 * 24 * 60, safeTo));

    if (safeTo <= safeFrom + 4) {
      safeTo = safeFrom + 5;
    }

    const windowMinutes = safeTo - safeFrom;

    const safeLookback = Number.isFinite(genLookbackMinutes)
      ? Math.max(windowMinutes, Math.min(7 * 24 * 60, Math.floor(genLookbackMinutes)))
      : Math.max(windowMinutes, 240);

    await withAuth(async ({ token }) => {
      const res = await fetch("/api/admin/signals/refresh-and-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbolToUse,
          strategyId: genStrategy,
          validFromOffsetMinutes: safeFrom,
          validToOffsetMinutes: safeTo,
          lookbackMinutes: safeLookback,
        }),
      });

      if (res.status === 401) {
        setState({ status: "not_logged_in" });
        setRefreshing(false);
        return;
      }

      if (res.status === 403) {
        setState({ status: "forbidden" });
        setRefreshing(false);
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        generated?: number;
        strategy?: { name?: string | null; type?: string | null };
      };

      if (!res.ok || body.ok !== true) {
        setSignalsError(body.error || `Nie udało się odświeżyć newsów i wygenerować sygnałów (${res.status}).`);
        setRefreshing(false);
        return;
      }

      const count = body.generated ?? 0;
      const stratName = body.strategy?.name ?? "baseline";
      setSignalsMessage(
        `Odświeżono newsy i wygenerowano ${count} sygnał(ów) dla ${symbolToUse} (strategia: ${stratName}, przedział ${safeFrom}–${safeTo} min od teraz, okno historii ${safeLookback} min).`
      );
      setRefreshing(false);

      await loadAssetsAndCandidates();
    });
  }

  async function handleAcceptRejectSignal(id: string, action: "accept" | "reject") {
    setSaving(true);
    setSignalsError(null);

    await withAuth(async ({ token }) => {
      const res = await fetch(`/api/admin/signals/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!res.ok || body.ok !== true) {
        setSignalsError(
          body.error || `Nie udało się ${action === "accept" ? "zaakceptować" : "odrzucić"} sygnału (${res.status}).`
        );
        setSaving(false);
        return;
      }

      setSaving(false);
      await loadAssetsAndCandidates();
    });
  }

  if (state.status === "loading") {
    return <p className="text-sm text-slate-600">Ładuję sygnały…</p>;
  }

  if (state.status === "not_logged_in") {
    return <p className="text-sm text-slate-600">Zaloguj się jako admin, aby zarządzać sygnałami.</p>;
  }

  if (state.status === "forbidden") {
    return <p className="text-sm text-rose-700">Brak uprawnień. Tylko administrator może zarządzać sygnałami.</p>;
  }

  if (state.status === "error") {
    return <p className="text-sm text-rose-700">Błąd: {state.message}</p>;
  }

  const { assets, candidates } = state;

  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Generator sygnałów</h2>
          <div className="flex flex-wrap items-end gap-2 text-left">
            <div className="space-y-1">
              <label
                className="block text-[10px] font-medium uppercase tracking-wide text-slate-500"
                htmlFor="gen-asset"
              >
                Asset
              </label>
              <select
                id="gen-asset"
                className="min-w-[120px] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                value={genSymbol}
                onChange={(e) => setGenSymbol(e.target.value)}
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.symbol}>
                    {a.symbol} — {a.name}
                  </option>
                ))}
                {assets.length === 0 && <option value="XAUUSD">XAUUSD</option>}
              </select>
            </div>
            <div className="space-y-1">
              <label
                className="block text-[10px] font-medium uppercase tracking-wide text-slate-500"
                htmlFor="gen-strategy"
              >
                Strategia
              </label>
              <select
                id="gen-strategy"
                className="min-w-[140px] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                value={genStrategy}
                onChange={(e) => setGenStrategy(e.target.value)}
              >
                <option value="baseline_v1">Baseline forecast + news (v1)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label
                className="block text-[10px] font-medium uppercase tracking-wide text-slate-500"
                htmlFor="gen-from"
              >
                Od (data/czas)
              </label>
              <input
                id="gen-from"
                type="datetime-local"
                value={genFromAt}
                onChange={(e) => setGenFromAt(e.target.value)}
                className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500" htmlFor="gen-to">
                Do (data/czas)
              </label>
              <input
                id="gen-to"
                type="datetime-local"
                value={genToAt}
                onChange={(e) => setGenToAt(e.target.value)}
                className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label
                className="block text-[10px] font-medium uppercase tracking-wide text-slate-500"
                htmlFor="gen-lookback"
              >
                Okno historii (min)
              </label>
              <input
                id="gen-lookback"
                type="number"
                min={5}
                max={7 * 24 * 60}
                value={genLookbackMinutes}
                onChange={(e) => setGenLookbackMinutes(Number(e.target.value))}
                className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
              onClick={() => void handleGenerateSignals()}
              disabled={generating || refreshing || syncingHistory || assets.length === 0}
            >
              {generating ? "Generuję sygnały…" : "Generuj sygnały"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
              onClick={() => void handleRefreshAndGenerate()}
              disabled={refreshing || generating || syncingHistory || assets.length === 0}
            >
              {refreshing ? "Odświeżam newsy i generuję…" : "Odśwież newsy + generuj"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
              onClick={() => void handleSyncPriceHistory()}
              disabled={syncingHistory || generating || refreshing}
            >
              {syncingHistory ? "Aktualizuję historię ceny…" : "Aktualizuj historię ceny"}
            </Button>
          </div>
          {signalsMessage && <p className="text-[11px] text-emerald-700">{signalsMessage}</p>}
          {signalsError && <p className="text-[11px] text-rose-700">{signalsError}</p>}
          <p className="text-[10px] text-slate-400">
            Generator używa prostego modelu baseline + news:
            <br />- <span className="font-semibold">Przedział od–do</span> – konkretny zakres dat/czasów, w którym
            sygnał ma być ważny (np. dziś 10:00–jutro 10:00),
            <br />- <span className="font-semibold">Okno historii</span> – z jak długiego okresu wstecz bierzemy dane do
            analizy (np. ostatnie 240 min).
            <br />
            Obecnie generujemy jeden sygnał na wywołanie; w przyszłości tu mogą pojawić się dodatkowe warianty /
            strategie.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Kandydaci sygnałów</h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-slate-600">
            Brak kandydatów sygnałów do przeglądu. Wygeneruj nowe sygnały powyżej.
          </p>
        ) : (
          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-[11px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Asset</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Czas (od–do)</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Kierunek</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Strategia</th>
                  <th className="px-2 py-1 text-left font-medium text-slate-500">Pewność</th>
                  <th className="px-2 py-1 text-right font-medium text-slate-500">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 border-slate-100">
                    <td className="px-2 py-1 align-top text-slate-700 font-mono text-[10px]">
                      {c.assets?.symbol ?? "?"}
                    </td>
                    <td className="px-2 py-1 align-top text-slate-700">
                      {c.valid_from ? (
                        <>
                          <div>
                            {new Date(c.valid_from).toLocaleString("pl-PL", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            do{" "}
                            {c.valid_to
                              ? new Date(c.valid_to).toLocaleTimeString("pl-PL", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "?"}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400">brak czasu</span>
                      )}
                    </td>
                    <td className="px-2 py-1 align-top">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
                          c.type === "BUY"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : c.type === "SELL"
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-slate-300 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-2 py-1 align-top text-slate-700">
                      {c.strategies?.name ?? "N/A"}
                      {c.strategies?.type && <div className="text-[10px] text-slate-400">({c.strategies.type})</div>}
                    </td>
                    <td className="px-2 py-1 align-top">
                      <span className="font-mono">{c.confidence}%</span>
                    </td>
                    <td className="px-2 py-1 align-top text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100 px-2 text-[10px] whitespace-nowrap"
                          onClick={() => void handleAcceptRejectSignal(c.id, "accept")}
                          disabled={saving}
                        >
                          Akceptuj
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="border-red-300 bg-white text-red-700 hover:bg-red-100 px-2 text-[10px] whitespace-nowrap"
                          onClick={() => void handleAcceptRejectSignal(c.id, "reject")}
                          disabled={saving}
                        >
                          Odrzuć
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
