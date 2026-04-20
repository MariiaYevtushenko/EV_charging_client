import { AppCard } from "./Primitives";
import type { Station } from "../../types/station";
import { stationStatusLabel, stationStatusTone } from "../../utils/stationLabels";
import { formatCountryLabel } from "../../utils/countryDisplay";
import { PrimaryButton, StatusPill } from "./Primitives";
import { OutlineButton } from "./Primitives";
import { useNavigate } from "react-router-dom";



export default function StationsTableList({
  selected,
  dashboardBase = '/station-dashboard',
  /** Якщо true — без переходу в режим редагування (напр. інформаційна карта для мережевого адміна). */
  readOnly = false,
  className = '',
  /** На сторінці карти: картка тягнеться по висоті колонки поруч із мапою. */
  fillHeight = false,
}: {
  selected?: Station;
  dashboardBase?: string;
  readOnly?: boolean;
  className?: string;
  fillHeight?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div
      className={`${fillHeight ? 'flex h-full min-h-0 flex-col' : 'space-y-4'} ${className}`.trim()}
    >
    {selected ? (
      <AppCard
        className={
          fillHeight
            ? 'flex min-h-0 flex-1 flex-col justify-between gap-4 shadow-md'
            : 'space-y-5'
        }
      >
        <div className={`flex flex-wrap items-start justify-between gap-2 ${fillHeight ? 'shrink-0' : ''}`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {[selected.city, formatCountryLabel(selected.country)].filter(Boolean).join(' · ') ||
                '—'}
            </p>
            <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
            <p className="mt-1 flex items-start gap-1.5 break-words text-sm text-gray-500">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {selected.address}
            </p>
          </div>
          <StatusPill tone={stationStatusTone(selected.status)}>
            {stationStatusLabel(selected.status)}
          </StatusPill>
        </div>

        <div className={`grid grid-cols-1 gap-2.5 ${fillHeight ? 'shrink-0' : ''}`}>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Дохід сьогодні</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {selected.todayRevenue.toLocaleString('uk-UA')} грн
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Сесії сьогодні</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{selected.todaySessions}</p>
          </div>
        </div>

        <div className={`flex flex-col gap-2 border-t border-gray-100 pt-4 ${fillHeight ? 'mt-auto shrink-0' : ''}`}>
          <PrimaryButton
            type="button"
            className="w-full justify-center"
            onClick={() => navigate(`${dashboardBase}/stations/${selected.id}`)}
          >
            Переглянути детально
          </PrimaryButton>
          {!readOnly ? (
            <OutlineButton
              type="button"
              className="w-full justify-center"
              onClick={() => navigate(`${dashboardBase}/stations/${selected.id}/edit`)}
            >
              Редагувати
            </OutlineButton>
          ) : null}
        </div>
      </AppCard>
    ) : (
      <AppCard
        className={
          fillHeight
            ? 'flex flex-1 flex-col items-center justify-center py-10 text-center text-sm text-gray-500'
            : 'py-10 text-center text-sm text-gray-500'
        }
      >
        Немає станції для перегляду.
      </AppCard>
    )}
  </div>
  );
}