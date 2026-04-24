import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { apiBaseUrl } from '../lib/apiBase';
import { FloatingToast, FloatingToastRegion } from './admin/FloatingToast';
import { OutlineButton } from './station-admin/Primitives';

type StatusResponse = {
  enabled: true;
  alreadyRun: boolean;
  inProgress?: boolean;
  lastError?: string | null;
};

const MSG_ALREADY_FROM_SERVER =
  'Дані вже завантажені';

/** 502/503/504 або обрив мережі — якщо API ще без фонового SEED */
const MSG_SEED_GATEWAY_OOPS =
  'Упс, щось пішло не так\n\nЗ’єднання могло обірвати проксі (типово 502). Спробуйте з терміналу в каталозі server: npm run seed:all (або npm run seed:all:fresh) або збільшіть read timeout проксі перед API.';

const POLL_MS = 2500;

/** Кнопка запуску повного SEED через API (фоновий процес на сервері + polling статусу). */
export default function SeedDemoDataButton() {
  const [visible, setVisible] = useState(false);
  const [alreadyRun, setAlreadyRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [doneLocal, setDoneLocal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorTitleId = useId();

  const clearSeedPoll = useCallback(() => {
    if (seedPollRef.current != null) {
      clearInterval(seedPollRef.current);
      seedPollRef.current = null;
    }
  }, []);

  const applySeedStatus = useCallback(
    (data: StatusResponse): 'continue' | 'done' | 'error' => {
      if (data.lastError) {
        setModalError(data.lastError);
        setLoading(false);
        return 'error';
      }
      if (data.alreadyRun && !data.inProgress) {
        setAlreadyRun(true);
        setDoneLocal(true);
        const msg =
          'Демо-дані успішно завантажено. Оновіть сторінку списку станцій, щоб побачити зміни';
        setSuccessMessage(msg);
        setToastMessage(msg);
        setLoading(false);
        return 'done';
      }
      return 'continue';
    },
    [],
  );

  const startSeedStatusPolling = useCallback(() => {
    clearSeedPoll();
    const base = apiBaseUrl();
    const tick = async () => {
      try {
        const res = await fetch(`${base}/api/dev/seed-from-csv/status`, {
          credentials: 'include',
        });
        if (res.status === 404) return;
        const data = (await res.json()) as StatusResponse;
        const r = applySeedStatus(data);
        if (r !== 'continue') clearSeedPoll();
      } catch {
        /* ігноруємо один тик; наступний спробує знову */
      }
    };
    void tick();
    seedPollRef.current = window.setInterval(() => void tick(), POLL_MS);
  }, [applySeedStatus, clearSeedPoll]);

  useEffect(() => {
    if (!toastMessage) {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      return;
    }
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 6500);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toastMessage]);

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
    let awaitBackgroundSeed = false;
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
        accepted?: boolean;
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
        const msg =
          typeof body.message === 'string' && body.message.length > 0 ? body.message : MSG_ALREADY_FROM_SERVER;
        setToastMessage(msg);
        setAlreadyRun(true);
        setDoneLocal(true);
        setSuccessMessage(msg);
        return;
      }
      if (res.status === 409 && body.error === 'in_progress') {
        setToastMessage(
          typeof body.message === 'string' && body.message.length > 0
            ? body.message
            : 'Заповнення БД уже виконується на сервері.',
        );
        awaitBackgroundSeed = true;
        startSeedStatusPolling();
        return;
      }
      if (res.status === 202 || body.accepted === true) {
        awaitBackgroundSeed = true;
        startSeedStatusPolling();
        return;
      }
      if (!res.ok) {
        const gateway = res.status === 502 || res.status === 503 || res.status === 504;
        const looksLikeHtmlErrorPage = raw.trimStart().startsWith('<');
        const msg =
          gateway || (res.status >= 500 && looksLikeHtmlErrorPage)
            ? MSG_SEED_GATEWAY_OOPS
            : typeof body.message === 'string' && body.message.length > 0
              ? body.message
              : raw.trim().slice(0, 4000) || `Помилка ${res.status}`;
        setModalError(msg);
        return;
      }
      const msg =
        typeof body.message === 'string' && body.message.length > 0
          ? body.message
          : 'Демо-дані успішно завантажено. Оновіть сторінку списку станцій, щоб побачити зміни';
      setToastMessage(msg);
      setAlreadyRun(true);
      setDoneLocal(true);
      setSuccessMessage(msg);
    } catch (e) {
      const net = e instanceof TypeError && /fetch|network|failed to fetch/i.test(String(e.message));
      setModalError(
        net ? MSG_SEED_GATEWAY_OOPS : e instanceof Error ? e.message : 'Упс, щось пішло не так',
      );
    } finally {
      if (!awaitBackgroundSeed) {
        setLoading(false);
      }
    }
  }, [startSeedStatusPolling]);

  if (!visible) return null;

  const finished = alreadyRun || doneLocal;
  const disabled = finished || loading;

  if (finished) {
    const lineText = doneLocal ? 'Готово' : successMessage ?? MSG_ALREADY_FROM_SERVER;
    return (
      <>
        <div role="status" aria-live="polite">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl border border-emerald-100/90 bg-emerald-50/50 px-3 py-2.5 text-xs leading-snug text-emerald-950/90">
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-emerald-700/90">
              SEED DATA
            </span>
            <span className="min-w-0">{lineText}</span>
          </p>
        </div>
        <FloatingToastRegion live="polite">
          <FloatingToast
            show={Boolean(toastMessage)}
            tone="success"
            onDismiss={() => setToastMessage(null)}
          >
            {toastMessage}
          </FloatingToast>
        </FloatingToastRegion>
      </>
    );
  }

  return (
    <>
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">SEED DATA</p>
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 to-white px-3 py-3 shadow-sm shadow-amber-900/5 ring-1 ring-amber-900/[0.04]"
          >
            <div
              className="h-7 w-7 shrink-0 rounded-full border-2 border-amber-200/90 border-t-amber-600 motion-reduce:animate-none animate-spin"
              aria-hidden
            />
            <span className="text-sm font-medium text-amber-950">Завантаження</span>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void runSeed()}
            className="w-full rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-white px-3 py-2.5 text-left text-sm font-medium text-amber-950 shadow-sm shadow-amber-900/5 transition hover:border-amber-300 hover:from-amber-50 hover:to-amber-50/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Заповнити БД (SEED)
          </button>
        )}
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
