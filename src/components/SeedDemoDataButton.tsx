import { useCallback, useEffect, useState } from 'react';
import { apiBaseUrl } from '../lib/apiBase';

type StatusResponse = { enabled: true; alreadyRun: boolean };

/**
 * Кнопка завантаження демо-даних (CSV + тарифи за 60 днів), один раз за запуск сервера API.
 * Показується лише якщо на бекенді ALLOW_DEV_SEED=true.
 * Розташування: у сайдбарі над «Вийти».
 */
export default function SeedDemoDataButton() {
  const [visible, setVisible] = useState(false);
  const [alreadyRun, setAlreadyRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneLocal, setDoneLocal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = apiBaseUrl();
    void fetch(`${base}/api/dev/seed-from-csv/status`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 404) return null;
        return res.json() as Promise<StatusResponse>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setVisible(true);
        setAlreadyRun(data.alreadyRun);
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runSeed = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const base = apiBaseUrl();
      const res = await fetch(`${base}/api/dev/seed-from-csv`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        already_run?: boolean;
      };
      if (res.status === 409 || body.error === 'already_run') {
        setAlreadyRun(true);
        setDoneLocal(true);
        return;
      }
      if (!res.ok) {
        setError(typeof body.message === 'string' ? body.message : `Помилка ${res.status}`);
        return;
      }
      setAlreadyRun(true);
      setDoneLocal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося виконати запит');
    } finally {
      setLoading(false);
    }
  }, []);

  if (!visible) return null;

  const disabled = alreadyRun || doneLocal || loading;

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        Демо-дані (CSV + тарифи)
      </p>
      {error ? (
        <p className="mb-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-800 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}
      {alreadyRun || doneLocal ? (
        <p className="rounded-xl border border-emerald-100/90 bg-emerald-50/50 px-3 py-2 text-xs leading-relaxed text-emerald-900/90">
          За цей запуск сервера демо-дані вже завантажені. Оновіть сторінку списку станцій, щоб
          побачити зміни.
        </p>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runSeed()}
          className="w-full rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white px-3 py-2.5 text-left text-sm font-medium text-amber-950 shadow-sm shadow-amber-900/5 transition hover:border-amber-300 hover:from-amber-50 hover:to-amber-50/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Завантаження…' : 'Завантажити демо (CSV + тарифи)'}
        </button>
      )}
    </div>
  );
}
