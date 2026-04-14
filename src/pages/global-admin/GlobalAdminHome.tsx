import { useEffect, useState } from 'react';
import { useStations } from '../../context/StationsContext';
import { AppCard } from '../../components/station-admin/Primitives';
import { fetchAdminDashboard } from '../../api/adminDashboard';

function IconStation({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3L4 7v10l8 4 8-4V7l-8-4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 12l8-4M12 12v10M12 12L4 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M16 12h3M4 11V9a2 2 0 012-2h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCloudOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M8.5 8.5A3.5 3.5 0 0117 10v.5M9 21h8a4 4 0 003.88-5M6.26 6.26A4 4 0 018.2 21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWrench({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GlobalAdminHome() {
  const { stationsTotal, stationStatusCounts, loading: stationsLoading } = useStations();

  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [todayRev, setTodayRev] = useState(0);
  const [todaySess, setTodaySess] = useState(0);
  const [paymentsOk, setPaymentsOk] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDashLoading(true);
      setDashError(null);
      try {
        const d = await fetchAdminDashboard();
        if (cancelled) return;
        setTodayRev(d.todayRevenueUah);
        setTodaySess(d.todaySessions);
        setPaymentsOk(d.todaySuccessfulPayments);
      } catch {
        if (!cancelled) {
          setDashError('Не вдалося завантажити статистику');
          setTodayRev(0);
          setTodaySess(0);
          setPaymentsOk(0);
        }
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const working = stationStatusCounts?.working ?? 0;
  const offline = stationStatusCounts?.offline ?? 0;
  const maintenance = stationStatusCounts?.maintenance ?? 0;
  const showDashPlaceholder = dashLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Головна</h1>
      </div>

      <AppCard className="relative overflow-hidden !p-0">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600" aria-hidden />
        <div className="p-6 pl-7 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner shadow-emerald-900/5 ring-1 ring-emerald-200/60">
              <IconStation className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Мережа зарядки</p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-4xl">
                {stationsLoading ? '…' : stationsTotal.toLocaleString('uk-UA')}
              </p>
              <p className="mt-1 text-sm text-gray-500">станцій у базі даних</p>
            </div>
          </div>
        </div>
      </AppCard>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Статус станцій</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <AppCard className="!p-5 transition hover:ring-emerald-200/80">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/70">
                <IconCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Працює</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">
                  {stationsLoading ? '…' : working.toLocaleString('uk-UA')}
                </p>
              </div>
            </div>
          </AppCard>
          <AppCard className="!p-5 transition hover:ring-slate-200/80">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
                <IconCloudOff className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Оффлайн</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">
                  {stationsLoading ? '…' : offline.toLocaleString('uk-UA')}
                </p>
              </div>
            </div>
          </AppCard>
          <AppCard className="!p-5 transition hover:ring-amber-200/80">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/70">
                <IconWrench className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Обслуговування</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">
                  {stationsLoading ? '…' : maintenance.toLocaleString('uk-UA')}
                </p>
              </div>
            </div>
          </AppCard>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Сьогодні</h2>
        <AppCard className="!p-6 sm:!p-7">
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            <div className="flex gap-4 border-b border-gray-100 pb-8 sm:border-b-0 sm:pb-0 sm:pr-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 ring-1 ring-green-200/70">
                <IconWallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Дохід</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-green-700 sm:text-[1.65rem]">
                  {showDashPlaceholder ? '…' : todayRev.toLocaleString('uk-UA')}{' '}
                  <span className="text-base font-semibold text-green-600/90">грн</span>
                </p>
                {dashError ? <p className="mt-2 text-xs text-red-600">{dashError}</p> : null}
              </div>
            </div>
            <div className="flex gap-4 border-b border-gray-100 pb-8 sm:border-b-0 sm:border-l sm:border-gray-100 sm:pb-0 sm:pl-6 sm:pr-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 ring-1 ring-sky-200/70">
                <IconBolt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сесії</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 sm:text-[1.65rem]">
                  {showDashPlaceholder ? '…' : todaySess.toLocaleString('uk-UA')}
                </p>
              </div>
            </div>
            <div className="flex gap-4 sm:pl-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/70">
                <IconCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Успішні платежі</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 sm:text-[1.65rem]">
                  {showDashPlaceholder ? '…' : paymentsOk.toLocaleString('uk-UA')}
                </p>
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
