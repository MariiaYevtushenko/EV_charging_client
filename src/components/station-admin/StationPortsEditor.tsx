import type { PortStatus, StationPort } from '../../types/station';
import { OutlineButton } from './Primitives';
import { appSelectClass } from './formStyles';
import { portStatusLabel } from '../../utils/stationLabels';

export const CONNECTOR_SUGGESTIONS = ['Type 2', 'CCS2', 'CHAdeMO', 'Tesla', 'Type 1'];

function newPortId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyPort(priceDefault = 0): StationPort {
  return {
    id: newPortId(),
    portNumber: 1,
    label: 'Порт A',
    connector: 'Type 2',
    powerKw: 22,
    pricePerKwh: priceDefault,
    status: 'available',
  };
}

const field =
  'mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500/30';

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
        powerKw: 22,
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
            className="rounded-xl border border-emerald-100/80 bg-emerald-50/25 p-3 shadow-sm shadow-emerald-900/5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700">Порт {index + 1}</span>
              <button
                type="button"
                disabled={ports.length <= 1}
                onClick={() => removePort(index)}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
              >
                Видалити
              </button>
            </div>
            <div
              className={
                onlyMaxPower
                  ? 'grid gap-2 sm:grid-cols-2'
                  : 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3'
              }
            >
              {onlyMaxPower ? (
                <>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      Тип порта
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
                      Макс. потужність (кВт)
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
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
