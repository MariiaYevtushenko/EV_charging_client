import { AdminAccentCard, AdminAccentRow } from "../admin/AdminAccentCard";
import type { Station } from "../../types/station";
import { stationStatusLabel, stationStatusTone } from "../../utils/stationLabels";
import { PrimaryButton, StatusPill } from "./Primitives";
import { OutlineButton } from "./Primitives";
import { useNavigate } from "react-router-dom";

function IconBuildingAccent({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

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
      <AdminAccentCard
        className={
          fillHeight
            ? 'flex min-h-0 flex-1 flex-col justify-between shadow-md'
            : ''
        }
      >
        <AdminAccentRow icon={<IconBuildingAccent className="h-6 w-6" />}>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 flex-1 text-base font-bold uppercase leading-snug tracking-tight text-slate-900 sm:text-lg">
                {selected.name}
              </h2>
              <StatusPill tone={stationStatusTone(selected.status)}>
                {stationStatusLabel(selected.status)}
              </StatusPill>
            </div>
            <p className="flex items-start gap-1.5 break-words text-sm text-gray-500">
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
              <span>{selected.address}</span>
            </p>
          </div>
        </AdminAccentRow>

        <div
          className={`grid grid-cols-1 gap-2.5 border-t border-gray-100 px-5 py-4 ${fillHeight ? 'shrink-0' : ''}`}
        >
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

        <div
          className={`flex flex-col gap-2 border-t border-gray-100 px-5 pb-5 pt-4 ${fillHeight ? 'mt-auto shrink-0' : ''}`}
        >
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
      </AdminAccentCard>
    ) : (
      <AdminAccentCard
        className={
          fillHeight
            ? 'flex flex-1 flex-col items-center justify-center'
            : ''
        }
      >
        <AdminAccentRow>
          <p className="text-sm text-gray-500">Немає станції для перегляду</p>
        </AdminAccentRow>
      </AdminAccentCard>
    )}
  </div>
  );
}