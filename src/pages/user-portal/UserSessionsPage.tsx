import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard } from '../../components/station-admin/Primitives';

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function UserSessionsPage() {
  const { sessions } = useUserPortal();

  const rows = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [sessions]
  );

  const totals = useMemo(() => {
    const kwh = rows.reduce((a, s) => a + s.kwh, 0);
    const cost = rows.reduce((a, s) => a + s.cost, 0);
    return { kwh, cost };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Історія сесій</h1>
        <p className="mt-1 text-sm text-gray-500">Зарядки, прив’язані до вашого облікового запису</p>
      </div>

      {rows.length > 0 ? (
        <AppCard className="!p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Усього енергії</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                {totals.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Сума за рахунками</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-green-700">
                {totals.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
              </p>
            </div>
          </div>
        </AppCard>
      ) : null}

      {rows.length === 0 ? (
        <AppCard className="py-12 text-center text-sm text-gray-500">
          Історія порожня — після зарядок сесії з’являться тут.
        </AppCard>
      ) : (
        <div className="relative pl-2">
          <div
            className="absolute bottom-3 left-[11px] top-3 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-100 to-transparent"
            aria-hidden
          />
          <ul className="space-y-0">
            {rows.map((s) => (
              <li key={s.id} className="relative pb-8 last:pb-0">
                <div className="absolute left-0 top-2 z-[1] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-600 shadow-sm shadow-green-600/20" />
                <div className="ml-10">
                  <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          to={`/dashboard/sessions/${s.id}`}
                          className="text-lg font-semibold text-gray-900 underline-offset-2 hover:text-green-800 hover:underline"
                        >
                          {s.stationName}
                        </Link>
                        <p className="mt-0.5 text-sm text-gray-600">{s.portLabel}</p>
                        <p className="mt-1 text-xs text-gray-500">{fmt(s.startedAt)}</p>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 sm:gap-x-6">
                          <div>
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Тривалість
                            </dt>
                            <dd className="mt-0.5 font-semibold tabular-nums text-gray-900">{s.durationMin} хв</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                              Енергія
                            </dt>
                            <dd className="mt-0.5 font-semibold tabular-nums text-gray-900">
                              {s.kwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год
                            </dd>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Сума</dt>
                            <dd className="mt-0.5 font-bold tabular-nums text-green-800">
                              {s.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
                            </dd>
                          </div>
                        </dl>
                        <p className="mt-3 text-xs font-semibold text-green-700">
                          <Link to={`/dashboard/sessions/${s.id}`} className="hover:underline">
                            Деталі сесії →
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
