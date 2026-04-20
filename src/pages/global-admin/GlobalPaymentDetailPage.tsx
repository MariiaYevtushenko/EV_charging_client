import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchAdminNetworkSessionDetail, type AdminSessionDetailDto } from '../../api/adminNetwork';
import { ApiError } from '../../api/http';
import PaymentBillDetailSection from '../../components/admin/PaymentBillDetailSection';
import { globalAdminPageTitle } from '../../styles/globalAdminTheme';

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export default function GlobalPaymentDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const fromUserId = (location.state as { fromUserId?: string } | null)?.fromUserId;

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
        setError(e instanceof ApiError ? e.message : 'Не вдалося завантажити дані');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!sessionId) {
    return (
      <p className="text-sm text-gray-500">
        Не вказано сесію.{' '}
        <Link to="/admin-dashboard/payments" className="font-semibold text-green-700 hover:text-green-800">
          До списку платежів
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-1.5">
          {fromUserId ? (
            <Link
              to={`/admin-dashboard/users/${encodeURIComponent(fromUserId)}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              <BackArrowIcon className="h-5 w-5" />
              До профілю користувача
            </Link>
          ) : null}
          <Link
            to="/admin-dashboard/payments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
          >
            <BackArrowIcon className="h-5 w-5" />
            Назад до списку платежів
          </Link>
        </div>
        <h1 className={`mt-4 ${globalAdminPageTitle}`}>
          Платіж · сесія №{sessionId}
        </h1>
      </div>

      {loading ? <p className="text-sm text-gray-500">Завантаження…</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      {!loading && data ? <PaymentBillDetailSection data={data} sessionId={sessionId} /> : null}
    </div>
  );
}
