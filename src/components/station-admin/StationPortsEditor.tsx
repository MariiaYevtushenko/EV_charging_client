import type { PortStatus, StationPort } from '../../types/station';
import { OutlineButton } from './Primitives';
import { appSelectClass } from './formStyles';
import { portStatusLabel } from '../../utils/stationLabels';

export const CONNECTOR_SUGGESTIONS = ['Type 2', 'CCS2', 'CHAdeMO', 'Tesla', 'Type 1'];

function newPortId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Дефолтна потужність нового порту (кВт), випадково 20…150 для наочності. */
function randomDefaultPortPowerKw(): number {
  return 20 + Math.floor(Math.random() * (150 - 20 + 1));
}

export function emptyPort(priceDefault = 0): StationPort {
  return {
    id: newPortId(),
    portNumber: 1,
    label: 'Порт A',
    connector: 'Type 2',
    powerKw: randomDefaultPortPowerKw(),
    pricePerKwh: priceDefault,
    status: 'available',
  };
}

const field =
  'mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500/30';

const fieldInline =
  'w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500/30';

const portInlineLabel =
  'shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-500';

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

export default function StationPortsEditor({
  ports,
  onChange,
  priceDefault = 7.5,
  onlyMaxPower = false,
}: {
  ports: StationPort[];
  onChange: (next: StationPort[]) => void;
  /** Для форми створення станції — лише поле потужності (кВт). */
  onlyMaxPower?: boolean;
  priceDefault?: number;
}) {
  const updatePort = (index: number, patch: Partial<StationPort>) => {
    onChange(ports.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const removePort = (index: number) => {
    if (ports.length <= 1) return;
    onChange(ports.filter((_, i) => i !== index));
  };

  const addPort = () => {
    const n = ports.length + 1;
    const letter = String.fromCharCode(64 + n);
    onChange([
      ...ports,
      {
        id: newPortId(),
        portNumber: n,
        label: `Порт ${letter}`,
        connector: 'Type 2',
        powerKw: randomDefaultPortPowerKw(),
        pricePerKwh: onlyMaxPower ? 0 : Number.isFinite(priceDefault) ? priceDefault : 7.5,
        status: 'available',
      },
    ]);
  };

  const connectorOpts = (current: string) => {
    const o = [...CONNECTOR_SUGGESTIONS];
    if (current && !o.includes(current)) o.push(current);
    return o;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
      
        <OutlineButton type="button" className="!py-1.5 !px-2 !text-xs" onClick={addPort}>
          + Порт
        </OutlineButton>
      </div>

      <div className="space-y-2">
        {ports.map((p, index) => (
          <div
            key={p.id}
            className="rounded-xl border border-emerald-100/80 bg-emerald-50/25 p-2 shadow-sm shadow-emerald-900/5 sm:p-3"
          >
            {onlyMaxPower ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:flex-nowrap sm:gap-x-3">
                <span className="shrink-0 text-xs font-semibold text-gray-700">Порт {index + 1}</span>
                <div className="flex min-w-[min(100%,12rem)] flex-1 items-center gap-1.5">
                  <span className={portInlineLabel}>Тип</span>
                  <label htmlFor={`port-conn-${p.id}`} className="sr-only">
                    Тип порта
                  </label>
                  <select
                    id={`port-conn-${p.id}`}
                    value={p.connector}
                    onChange={(e) => updatePort(index, { connector: e.target.value })}
                    className={`min-w-0 flex-1 ${appSelectClass} !py-2 !text-sm`}
                  >
                    {connectorOpts(p.connector).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex w-[6.25rem] shrink-0 items-center gap-1.5 sm:w-28">
                  <span className={portInlineLabel}>кВт</span>
                  <label htmlFor={`port-kw-${p.id}`} className="sr-only">
                    Макс. потужність (кВт)
                  </label>
                  <input
                    id={`port-kw-${p.id}`}
                    inputMode="decimal"
                    value={String(p.powerKw)}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value.replace(',', '.'));
                      updatePort(index, { powerKw: Number.isFinite(n) ? n : 0 });
                    }}
                    className={fieldInline}
                  />
                </div>
                <button
                  type="button"
                  disabled={ports.length <= 1}
                  onClick={() => removePort(index)}
                  title="Видалити порт"
                  aria-label="Видалити порт"
                  className="ml-auto shrink-0 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 sm:ml-0"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700">Порт {index + 1}</span>
                  <button
                    type="button"
                    disabled={ports.length <= 1}
                    onClick={() => removePort(index)}
                    title="Видалити порт"
                    aria-label="Видалити порт"
                    className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      Назва
                    </label>
                    <input
                      value={p.label}
                      onChange={(e) => updatePort(index, { label: e.target.value })}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      Конектор
                    </label>
                    <select
                      value={p.connector}
                      onChange={(e) => updatePort(index, { connector: e.target.value })}
                      className={`mt-0.5 ${appSelectClass} !py-2 !text-sm`}
                    >
                      {connectorOpts(p.connector).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      Статус
                    </label>
                    <select
                      value={p.status}
                      onChange={(e) => updatePort(index, { status: e.target.value as PortStatus })}
                      className={`mt-0.5 ${appSelectClass} !py-2 !text-sm`}
                    >
                      <option value="available">{portStatusLabel('available')}</option>
                      <option value="busy">{portStatusLabel('busy')}</option>
                      <option value="offline">{portStatusLabel('offline')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      кВт
                    </label>
                    <input
                      inputMode="decimal"
                      value={String(p.powerKw)}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value.replace(',', '.'));
                        updatePort(index, { powerKw: Number.isFinite(n) ? n : 0 });
                      }}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      грн/кВт·год
                    </label>
                    <input
                      inputMode="decimal"
                      value={String(p.pricePerKwh)}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value.replace(',', '.'));
                        updatePort(index, { pricePerKwh: Number.isFinite(n) ? n : 0 });
                      }}
                      className={field}
                    />
                  </div>
                  {p.status === 'busy' ? (
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        ETA
                      </label>
                      <input
                        value={p.occupiedEta ?? ''}
                        onChange={(e) => updatePort(index, { occupiedEta: e.target.value || undefined })}
                        placeholder="~12 хв"
                        className={field}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
