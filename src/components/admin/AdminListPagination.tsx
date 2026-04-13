import { OutlineButton } from '../station-admin/Primitives';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Навігація по сторінках для адмін-списків (50 елементів на бекенді). */
export default function AdminListPagination({ page, pageSize, total, onPageChange, className }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
    >
      <p className="text-sm text-gray-600">
        Показано{' '}
        <span className="font-semibold text-gray-900">
          {from}–{to}
        </span>{' '}
        з <span className="font-semibold text-gray-900">{total}</span> · сторінка {page} з {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <OutlineButton
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="!text-sm"
        >
          Назад
        </OutlineButton>
        <OutlineButton
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="!text-sm"
        >
          Далі
        </OutlineButton>
      </div>
    </div>
  );
}
