import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard } from '../../components/station-admin/Primitives';

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

export default function UserSessionsPage() {
  const navigate = useNavigate();
  const { sessions } = useUserPortal();

  const rows = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [sessions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Історія сесій</h1>
        </div>

      <AppCard className="overflow-x-auto !p-0" padding={false}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Станція</th>
              <th className="px-4 py-3">Порт</th>
              <th className="px-4 py-3">Початок</th>
              <th className="px-4 py-3">Тривалість</th>
              <th className="px-4 py-3 text-right">кВт·год</th>
              <th className="px-4 py-3 text-right">Сума</th>
              <th className="sr-only w-28 px-4 py-3">Деталі</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((s) => (
              <tr
                key={s.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-white transition hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500"
                onClick={() => navigate(`/dashboard/sessions/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/dashboard/sessions/${s.id}`);
                  }
                }}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{s.stationName}</td>
                <td className="px-4 py-3 text-gray-600">{s.portLabel}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmt(s.startedAt)}</td>
                <td className="px-4 py-3 tabular-nums text-gray-700">{s.durationMin} хв</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{s.kwh}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-green-700">
                  {s.cost.toLocaleString('uk-UA')} грн
                </td>
                <td className="px-4 py-3 text-right text-xs font-semibold text-green-700">Деталі →</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Історія порожня.</p>
        ) : null}
      </AppCard>
    </div>
  );
}
