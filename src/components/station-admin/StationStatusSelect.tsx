import type { StationStatus } from '../../types/station';
import { stationStatusLabel } from '../../utils/stationLabels';

const OPTIONS_NEW: StationStatus[] = ['working', 'maintenance', 'offline'];
/** Редагування: без «Архів» — перенесення в архів окремим перемикачем на формі. */
const OPTIONS_EDIT: StationStatus[] = ['working', 'maintenance', 'offline'];

function optionButtonClass(status: StationStatus, selected: boolean): string {
  const base =
    'min-w-[6.75rem] flex-1 rounded-xl border-2 px-3 py-2.5 text-center text-sm font-semibold transition ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/45 focus-visible:ring-offset-1 ' +
    'sm:min-w-0 sm:flex-initial';
  if (!selected) {
    return `${base} border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50/90 active:scale-[0.99]`;
  }
  switch (status) {
    case 'working':
      return `${base} border-green-600 bg-green-50 text-green-900 shadow-sm shadow-green-900/10 ring-1 ring-green-600/15`;
    case 'maintenance':
      return `${base} border-amber-500 bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-500/20`;
    case 'offline':
      return `${base} border-slate-400 bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-400/25`;
    case 'archived':
      return `${base} border-gray-500 bg-gray-100 text-gray-900 shadow-sm ring-1 ring-gray-500/20`;
    default:
      return `${base} border-green-600 bg-green-50 text-green-900`;
  }
}

type Props = {
  value: StationStatus;
  onChange: (v: StationStatus) => void;
  /** На сторінці створення — без «Архів». */
  variant?: 'new' | 'edit';
};

/**
 * Вибір статусу станції: сегментовані кнопки замість `<select>`, стилі узгоджені зі статус-пілами.
 */
export default function StationStatusSelect({ value, onChange, variant = 'new' }: Props) {
  const options = variant === 'edit' ? OPTIONS_EDIT : OPTIONS_NEW;

  return (
    <div
      className="mt-2 flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Статус станції"
    >
      {options.map((s) => {
        const selected = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(s)}
            className={optionButtonClass(s, selected)}
          >
            {stationStatusLabel(s)}
          </button>
        );
      })}
    </div>
  );
}
