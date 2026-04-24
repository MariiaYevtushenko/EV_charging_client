import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { fetchUserPayments, postUserPayBill } from '../../api/userReads';
import { mapBillApiToPaymentRow } from '../../api/userPortalMappers';
import { ApiError } from '../../api/http';
import { BookingTypeCell } from '../../components/admin/BookingTypeCell';
import { AppCard, StatusPill } from '../../components/station-admin/Primitives';
import { appPrimaryCtaClass } from '../../components/station-admin/formStyles';
import { userPortalPageTitle } from '../../styles/userPortalTheme';

const backLinkClass =
  'inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline';

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

const linkAccentClass =
  'inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline';

function paymentTone(s: string): 'success' | 'warn' | 'danger' | 'muted' {
  switch (s) {
    case 'success':
      return 'success';
    case 'pending':
      return 'warn';
    case 'failed':
      return 'danger';
    default:
      return 'muted';
  }
}

function paymentLabel(s: string) {
  switch (s) {
    case 'success':
      return 'Успішно';
    case 'pending':
      return 'Очікує на оплату';
    case 'failed':
      return 'Відмовлено';
    default:
      return s;
  }
}

function fmtCreated(dt: string) {
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

/** Дата оплати в картці — лише число (дд.мм.рррр). */
function fmtPaidDateOnly(dt: string) {
  try {
    return new Date(dt).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dt;
  }
}

function formatPaymentMethod(raw: string): string {
  switch (raw) {
    case 'CARD':
      return 'Картка';
    case 'APPLE_PAY':
      return 'Apple Pay';
    case 'GOOGLE_PAY':
      return 'Google Pay';
    default:
      return raw.replace(/_/g, ' ');
  }
}

const PAY_METHODS = ['CARD', 'APPLE_PAY', 'GOOGLE_PAY'] as const;

export default function UserPaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { user } = useAuth();
  const { payments, replacePayments } = useUserPortal();
  const [payMethod, setPayMethod] = useState<(typeof PAY_METHODS)[number]>('CARD');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const payment = useMemo(() => payments.find((p) => p.id === paymentId), [payments, paymentId]);

  if (!payment) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/payments" className={backLinkClass}>
          ← До платежів
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Платіж не знайдено</AppCard>
      </div>
    );
  }

  const avgPerKwh =
    payment.energyKwh != null && payment.energyKwh > 0 && payment.amount > 0
      ? payment.amount / payment.energyKwh
      : null;

  const pricePerKwhDisplay =
    payment.pricePerKwhAtTime != null && payment.pricePerKwhAtTime > 0
      ? payment.pricePerKwhAtTime
      : avgPerKwh;

  const paidDisplay =
    payment.status === 'success'
      ? `${payment.amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`
      : '—';

  const handlePay = async () => {
    const uid = user?.id != null ? Number(user.id) : NaN;
    const pid = paymentId != null ? Number(paymentId) : NaN;
    if (!Number.isFinite(uid) || !Number.isFinite(pid)) return;
    setPayError(null);
    setPaying(true);
    try {
      await postUserPayBill(uid, pid, { paymentMethod: payMethod });
      const rows = await fetchUserPayments(uid);
      replacePayments(rows.map((r) => mapBillApiToPaymentRow(r)));
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Не вдалося підтвердити оплату';
      setPayError(msg);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard/payments" className={backLinkClass}>
          ← До платежів
        </Link>
        <h1 className={`${userPortalPageTitle} mt-3`}>Платіж #{payment.id}</h1>
      </div>

      <AppCard padding={false} className="overflow-hidden border-slate-200/90 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Статус оплати:</span>
            <StatusPill tone={paymentTone(payment.status)}>{paymentLabel(payment.status)}</StatusPill>
          </div>
          <p className="text-sm text-slate-600">
            <span className="text-slate-500">Рахунок створено:</span>{' '}
            <span className="font-medium text-slate-800">{fmtCreated(payment.createdAt)}</span>
          </p>
        </div>

        {payment.paidAt ? (
          <div className="border-b border-slate-100 px-5 py-4">
            <p className={sectionLabel}>Дата оплати</p>
            <p className="mt-1.5 text-sm font-medium text-slate-900">{fmtPaidDateOnly(payment.paidAt)}</p>
          </div>
        ) : null}

        {payment.sessionStartedAt || payment.sessionEndedAt ? (
          <div className="border-b border-slate-100 px-5 py-4">
            <p className={sectionLabel}>Час зарядки (сесія)</p>
            {payment.sessionStartedAt ? (
              <p className="mt-1.5 text-sm font-medium text-slate-900">
                Початок: {fmtCreated(payment.sessionStartedAt)}
              </p>
            ) : null}
            {payment.sessionEndedAt ? (
              <p
                className={`text-sm font-medium text-slate-900 ${payment.sessionStartedAt ? 'mt-1' : 'mt-1.5'}`}
              >
                Завершення: {fmtCreated(payment.sessionEndedAt)}
              </p>
            ) : payment.sessionStartedAt ? (
              <p className="mt-1 text-xs text-slate-500">Кінець сесії ще не зафіксовано в системі</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 border-b border-slate-100 px-5 py-5 sm:grid-cols-2">
          <div>
            <p className={sectionLabel}>Сума до сплати</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
              {payment.amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн
            </p>
          </div>
          <div>
            <p className={sectionLabel}>Спосіб оплати</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {payment.method ? formatPaymentMethod(payment.method) : '—'}
            </p>
          </div>
        </div>

        <div className="grid gap-6 border-b border-slate-100 px-5 py-5 sm:grid-cols-3">
          <div>
            <p className={sectionLabel}>Ціна кВт·год</p>
            <p className="mt-2 text-sm font-semibold tabular-nums text-slate-900">
              {pricePerKwhDisplay != null
                ? `${pricePerKwhDisplay.toLocaleString('uk-UA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })} грн/кВт·год`
                : '—'}
            </p>
          </div>
          <div>
            <p className={sectionLabel}>Оплачено</p>
            <p className="mt-2 text-sm font-semibold tabular-nums text-slate-900">{paidDisplay}</p>
          </div>
          <div>
            <p className={sectionLabel}>Енергія (сесія)</p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">
              {payment.energyKwh != null
                ? `${payment.energyKwh.toLocaleString('uk-UA', { maximumFractionDigits: 3 })} кВт·год`
                : '—'}
            </p>
          </div>
        </div>
        {payment.sessionId ? (
          <div className="px-5 py-5">
            <Link
              to={`/dashboard/sessions/${payment.sessionId}`}
              className={`${linkAccentClass} inline-flex`}
            >
              Повна сесія
              <span aria-hidden className="text-base leading-none">
                ›
              </span>
            </Link>
          </div>
        ) : null}

        
{payment.bookingId ? (
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <p className={sectionLabel}>Передплата за бронюванням</p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-slate-900">
                  {payment.bookingType === 'DEPOSIT' && payment.prepaymentAmount != null
                    ? `${payment.prepaymentAmount.toLocaleString('uk-UA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} грн`
                    : '—'}
                </p>
                {payment.bookingType === 'CALC' ? (
                  <p className="mt-1 text-xs text-slate-500">Динамічний тариф без фіксованої передплати</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {payment.bookingType ? (
                  <BookingTypeCell
                    bookingType={payment.bookingType}
                    prepaymentAmount={payment.prepaymentAmount ?? 0}
                  />
                ) : null}
                <Link
                  to={`/dashboard/bookings/${payment.bookingId}`}
                  className={`${linkAccentClass} text-sm`}
                >
                  Бронювання
                  <span aria-hidden className="text-base leading-none">
                    ›
                  </span>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {payment.status === 'pending' ? (
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-4">
            <p className={sectionLabel}>Оплата</p>
            
            <div className="mt-5 flex min-h-[3.25rem] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div
                className="flex min-h-[3.25rem] flex-1 flex-wrap content-center items-center gap-2 sm:min-w-0"
                role="radiogroup"
                aria-label="Спосіб оплати"
              >
                {PAY_METHODS.map((m) => {
                  const selected = payMethod === m;
                  return (
                    <label
                      key={m}
                      className={`inline-flex min-h-[3.25rem] min-w-0 cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition sm:min-h-[3.25rem] ${
                        selected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pay-method"
                        className="sr-only"
                        checked={selected}
                        onChange={() => setPayMethod(m)}
                      />
                      {formatPaymentMethod(m)}
                    </label>
                  );
                })}
              </div>
              <div className="flex shrink-0 justify-end sm:items-center sm:self-stretch">
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => void handlePay()}
                  className={`${appPrimaryCtaClass} inline-flex h-12 min-w-[9.5rem] items-center justify-center px-6 py-3 text-base disabled:opacity-60`}
                >
                  {paying ? 'Обробка…' : 'Оплатити'}
                </button>
              </div>
            </div>
            {payError ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {payError}
              </p>
            ) : null}
          </div>
        ) : null}


     
      </AppCard>
    </div>
  );
}
