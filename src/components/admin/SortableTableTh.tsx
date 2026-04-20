export type SortDir = 'asc' | 'desc';

type Props = {
  label: string;
  /** Ідентифікатор колонки (узгоджується з логікою сортування на сторінці). */
  columnKey: string;
  activeKey: string;
  dir: SortDir;
  onSort: (columnKey: string) => void;
  align?: 'left' | 'right';
  /** Класи для `<th>` (напр. `px-5` у таблиці тарифів). */
  thClassName?: string;
};

/** Заголовок колонки з сортуванням (▲ / ▼ / ⇅), стиль як у списку станцій. */
export default function SortableTableTh({
  label,
  columnKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
  thClassName = 'px-4 py-3',
}: Props) {
  const active = activeKey === columnKey;
  return (
    <th
      scope="col"
      className={`${thClassName} ${align === 'right' ? 'text-right' : 'text-left'}`}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-lg uppercase tracking-wide transition hover:bg-gray-100/90 hover:text-gray-800 ${
          align === 'right' ? 'w-full justify-end' : ''
        } ${active ? 'font-bold text-green-800' : 'font-semibold text-gray-500'}`}
      >
        <span>{label}</span>
        <span className="select-none text-[10px] leading-none opacity-80" aria-hidden>
          {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </button>
    </th>
  );
}

/** Типові напрямки для нової колонки: дати/числа — спочатку «більше/новіші» (desc), текст — А→Я (asc). */
export function defaultDirForSortColumn(columnKey: string): SortDir {
  if (
    [
      'startedAt',
      'start',
      'createdAt',
      'effectiveDate',
      'kwh',
      'cost',
      'amount',
      'dayPrice',
      'nightPrice',
      'duration',
    ].includes(columnKey)
  ) {
    return 'desc';
  }
  return 'asc';
}
