import type { AdminNetworkBookingRow } from '../../api/adminNetwork';

function BanknotesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H18.75v-.75m0 0h.375c.621 0 1.125-.504 1.125-1.125v-9.75c0-.621-.504-1.125-1.125-1.125h-.375m0 0H15"
      />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  );
}

const TOOLTIP_DEPOSIT =
  'Передплата: фіксована сума резервується при бронюванні та списується згідно з правилами мережі.';
const TOOLTIP_CALC =
  'Динамічний тариф: оплата за фактично спожиту енергію за діючим тарифом на момент сесії.';

type Props = {
  bookingType: AdminNetworkBookingRow['bookingType'];
  prepaymentAmount: number;
};

/** Іконка + сума (передплата) або графік угору (динамічний), з підказкою при наведенні. */
export function BookingTypeCell({ bookingType, prepaymentAmount }: Props) {
  if (bookingType === 'DEPOSIT') {
    const amountStr = prepaymentAmount.toLocaleString('uk-UA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return (
      <span
        className="inline-flex cursor-help items-center gap-1.5 text-sm text-gray-500"
        title={TOOLTIP_DEPOSIT}
      >
        <BanknotesIcon className="h-4 w-4 shrink-0" />
       
      </span>
    );
  }

  return (
    <span
      className="inline-flex cursor-help items-center justify-center text-gray-500"
      title={TOOLTIP_CALC}
    >
      <TrendingUpIcon className="h-5 w-5" />
     
    </span>
  );
}
