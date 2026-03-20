import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStations } from '../../context/StationsContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';

function fmtFull(dt: string) {
  try {
    return new Date(dt).toLocaleString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dt;
  }
}

function durationLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h} год ${m} хв (${min} хв)`;
  if (h > 0) return `${h} год (${min} хв)`;
  return `${min} хв`;
}

export default function UserSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions } = useUserPortal();
  const { getStation } = useStations();

  const session = useMemo(() => sessions.find((s) => s.id === sessionId), [sessions, sessionId]);
  const station = session ? getStation(session.stationId) : undefined;

  const avgPerKwh =
    session && session.kwh > 0 ? session.cost / session.kwh : null;

  if (!session) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/sessions" className="text-sm font-medium text-green-700 hover:underline">
          ← До історії сесій
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Сесію не знайдено.</AppCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard/sessions" className="text-sm font-medium text-green-700 hover:underline">
        ← До історії сесій
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Деталі сесії</h1>
          <p className="mt-1 font-mono text-xs text-gray-400">ID: {session.id}</p>
        </div>
        <StatusPill tone="muted">Завершено</StatusPill>
      </div>

      <AppCard className="!p-6">
        <p className="text-lg font-bold text-gray-900">{session.stationName}</p>
        {station ? (
          <p className="mt-1 text-sm text-gray-600">
            {station.city}, {station.address}
          </p>
        ) : null}

        <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Порт</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{session.portLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Тривалість</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{durationLabel(session.durationMin)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Початок</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{fmtFull(session.startedAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Кінець</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{fmtFull(session.endedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Енергія</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-gray-900">
              {session.kwh.toLocaleString('uk-UA')} кВт·год
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Вартість</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-green-700">
              {session.cost.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
            </dd>
          </div>
          {avgPerKwh != null ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Середня ціна (демо)</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-800">
                {avgPerKwh.toLocaleString('uk-UA', { maximumFractionDigits: 2 })} грн / кВт·год
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <Link
            to={`/dashboard/stations/${session.stationId}`}
            className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            Сторінка станції
          </Link>
        </div>
      </AppCard>
    </div>
  );
}
