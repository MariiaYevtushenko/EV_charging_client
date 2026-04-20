import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  fetchAdminNetworkSessionDetail,
  postAdminNetworkSessionComplete,
  type AdminSessionDetailDto,
} from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import AdminSessionDetailView, {
  AdminSessionDetailBackLink,
} from '../../components/admin/AdminSessionDetailView';
import { globalAdminPageTitle } from '../../styles/globalAdminTheme';

export default function GlobalSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const [data, setData] = useState<AdminSessionDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    void fetchAdminNetworkSessionDetail(sessionId)
      .then(setData)
      .catch((e: unknown) => {
        setData(null);
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити сесію');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCompleteSession = useCallback(
    async (opts: { kwhConsumed?: number }) => {
      if (!sessionId) return;
      setCompleting(true);
      setCompleteError(null);
      try {
        const updated = await postAdminNetworkSessionComplete(sessionId, opts);
        setData(updated);
      } catch (e: unknown) {
        setCompleteError(e instanceof ApiError ? e.message : 'Не вдалося завершити сесію');
      } finally {
        setCompleting(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    const focusBill = (location.state as { focusBill?: boolean } | null)?.focusBill;
    if (!focusBill || loading || !data) return;
    const id = window.setTimeout(() => {
      document.getElementById('admin-session-bill')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(id);
  }, [loading, data, location.state]);

  const fromUserId = (location.state as { fromUserId?: string } | null)?.fromUserId;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
          {fromUserId ? (
            <AdminSessionDetailBackLink to={`/admin-dashboard/users/${encodeURIComponent(fromUserId)}`}>
              До профілю користувача
            </AdminSessionDetailBackLink>
          ) : null}
          <AdminSessionDetailBackLink to="/admin-dashboard/sessions">До списку сесій</AdminSessionDetailBackLink>
        </div>
        <h1 className={`mt-3 ${globalAdminPageTitle}`}>Сесія #{sessionId}</h1>
      </div>

      {loading ? <p className="text-sm text-gray-500">Завантаження…</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {!loading && data ? (
        <AdminSessionDetailView
          data={data}
          links={{
            stationHref: (stationId) => `/admin-dashboard/stations/${stationId}`,
            userHref: (userId) => `/admin-dashboard/users/${userId}`,
            bookingHref: (bookingId) => `/admin-dashboard/bookings/${bookingId}`,
          }}
          sessionControl={{
            onComplete: handleCompleteSession,
            completing,
            error: completeError,
          }}
        />
      ) : null}
    </div>
  );
}
