import type { ButtonHTMLAttributes } from 'react';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function fmtNum(n: number): string {
  return n.toLocaleString('uk-UA');
}

function ChevronPrev({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronNext({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function NavIconBtn(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      type="button"
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 transition hover:bg-gray-100 active:bg-gray-200/80 disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none ${className}`}
      {...rest}
    />
  );
}

/** Навігація по сторінках для адмін-списків (розмір сторінки задається бекендом або сторінкою). */
export default function AdminListPagination({ page, pageSize, total, onPageChange, className }: Props) {
  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  return (
    <div
      className={`flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className ?? ''}`}
    >
      <p className="shrink-0 text-sm tabular-nums text-gray-600">
        Показано{' '}
        <span className="font-semibold text-gray-900">
          {fmtNum(from)}–{fmtNum(to)}
        </span>{' '}
        з <span className="font-semibold text-gray-900">{fmtNum(total)}</span>
      </p>

      <nav
        className="flex items-center justify-center gap-2 sm:justify-end sm:gap-3"
        aria-label="Перемикання сторінок"
      >
        <NavIconBtn
          disabled={atFirst}
          onClick={() => onPageChange(page - 1)}
          title="Попередня сторінка"
          aria-label="Попередня сторінка"
        >
          <ChevronPrev />
        </NavIconBtn>
        <p className="min-w-0 px-1 text-center text-sm tabular-nums text-gray-600">
          · сторінка <span className="font-semibold text-gray-900">{fmtNum(page)}</span> з{' '}
          <span className="font-semibold text-gray-900">{fmtNum(totalPages)}</span>
        </p>
        <NavIconBtn
          disabled={atLast}
          onClick={() => onPageChange(page + 1)}
          title="Наступна сторінка"
          aria-label="Наступна сторінка"
        >
          <ChevronNext />
        </NavIconBtn>
      </nav>
    </div>
  );
}
