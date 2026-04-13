import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAdminNetworkSessionDetail, type AdminSessionDetailDto } from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import AdminSessionDetailView, {
  AdminSessionDetailBackLink,
} from '../../components/admin/AdminSessionDetailView';

export default function StationSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<AdminSessionDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <AdminSessionDetailBackLink to="/station-dashboard/sessions">Назад до списку сесій</AdminSessionDetailBackLink>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Сесія #{sessionId}</h1>
      </div>

      {loading ? <p className="text-sm text-gray-500">Завантаження…</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {!loading && data ? (
        <AdminSessionDetailView
          data={data}
          links={{
            stationHref: (stationId) => `/station-dashboard/stations/${stationId}`,
          }}
        />
      ) : null}
    </div>
  );
}
