import { useCallback, useEffect, useId, useState } from 'react';
import { apiBaseUrl } from '../lib/apiBase';
import { OutlineButton } from './station-admin/Primitives';

type StatusResponse = { enabled: true; alreadyRun: boolean };

const MSG_ALREADY_FROM_SERVER =
  'Дані вже завантажені';


  // Запуск SEED з сервера
export default function SeedDemoDataButton() {
  const [visible, setVisible] = useState(false);
  const [alreadyRun, setAlreadyRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [doneLocal, setDoneLocal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const errorTitleId = useId();

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
        if (data.alreadyRun) {
          setAlreadyRun(true);
          setSuccessMessage(MSG_ALREADY_FROM_SERVER);
        }
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalError) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalError(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalError]);

  const runSeed = useCallback(async () => {
    setModalError(null);
    setLoading(true);
    try {
      const base = apiBaseUrl();
      const res = await fetch(`${base}/api/dev/seed-from-csv`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const raw = await res.text();
      let body: {
        ok?: boolean;
        message?: string;
        error?: string;
        already_run?: boolean;
      } = {};
      try {
        body = JSON.parse(raw) as typeof body;
      } catch {
        /* not JSON */
      }

      if (res.status === 409 || body.error === 'already_run') {
        setAlreadyRun(true);
        setDoneLocal(true);
        setSuccessMessage(
          typeof body.message === 'string' && body.message.length > 0 ? body.message : MSG_ALREADY_FROM_SERVER,
        );
        return;
      }
      if (!res.ok) {
        const msg =
          typeof body.message === 'string' && body.message.length > 0
            ? body.message
            : raw.trim().slice(0, 4000) || `Помилка ${res.status}`;
        setModalError(msg);
        return;
      }
      setAlreadyRun(true);
      setDoneLocal(true);
      setSuccessMessage(
        typeof body.message === 'string' && body.message.length > 0
          ? body.message
          : 'Демо-дані успішно завантажено. Оновіть сторінку списку станцій, щоб побачити зміни.',
      );
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Не вдалося виконати запит');
    } finally {
      setLoading(false);
    }
  }, []);

  if (!visible) return null;

  const finished = alreadyRun || doneLocal;
  const disabled = finished || loading;

  if (finished) {
    return (
      <div role="status" aria-live="polite">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700/90">
          SEED DATA
        </p>
        <p className="rounded-xl border border-emerald-100/90 bg-emerald-50/50 px-3 py-2.5 text-xs leading-relaxed text-emerald-950/90">
          {successMessage ?? MSG_ALREADY_FROM_SERVER}
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">SEED DATA</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runSeed()}
          className="w-full rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white px-3 py-2.5 text-left text-sm font-medium text-amber-950 shadow-sm shadow-amber-900/5 transition hover:border-amber-300 hover:from-amber-50 hover:to-amber-50/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Завантаження…' : 'Заповнити БД (SEED)'}
        </button>
      </div>

      {modalError ? (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={errorTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/45 backdrop-blur-[2px]"
            aria-label="Закрити"
            onClick={() => setModalError(null)}
          />
          <div className="relative z-10 max-h-[min(70vh,520px)] w-full max-w-lg overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
            <div className="border-b border-red-50 bg-red-50/80 px-5 py-3">
              <h2 id={errorTitleId} className="text-base font-semibold text-red-950">
                Помилка SEED
              </h2>
            </div>
            <pre className="max-h-[min(50vh,360px)] overflow-auto whitespace-pre-wrap break-words px-5 py-4 text-left text-xs leading-relaxed text-gray-800">
              {modalError}
            </pre>
            <div className="flex justify-end border-t border-gray-100 px-5 py-3">
              <OutlineButton type="button" onClick={() => setModalError(null)}>
                Закрити
              </OutlineButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
