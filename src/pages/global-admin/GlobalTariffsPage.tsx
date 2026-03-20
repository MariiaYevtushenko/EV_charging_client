import { useEffect, useState } from 'react';
import { useGlobalAdmin } from '../../context/GlobalAdminContext';
import type { TariffPlan } from '../../types/globalAdmin';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appInputCompactClass } from '../../components/station-admin/formStyles';

function TariffEditor({
  plan,
  onSave,
}: {
  plan: TariffPlan;
  onSave: (patch: Partial<TariffPlan>) => void;
}) {
  const [name, setName] = useState(plan.name);
  const [dayPrice, setDayPrice] = useState(String(plan.dayPrice));
  const [nightPrice, setNightPrice] = useState(String(plan.nightPrice));
  const [dayStart, setDayStart] = useState(plan.dayStart);
  const [dayEnd, setDayEnd] = useState(plan.dayEnd);
  const [description, setDescription] = useState(plan.description);
  const [stationsCount, setStationsCount] = useState(String(plan.stationsCount));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(plan.name);
    setDayPrice(String(plan.dayPrice));
    setNightPrice(String(plan.nightPrice));
    setDayStart(plan.dayStart);
    setDayEnd(plan.dayEnd);
    setDescription(plan.description);
    setStationsCount(String(plan.stationsCount));
  }, [plan]);

  const handleSave = () => {
    const d = parseFloat(dayPrice.replace(',', '.'));
    const n = parseFloat(nightPrice.replace(',', '.'));
    const sc = parseInt(stationsCount, 10);
    onSave({
      name: name.trim() || plan.name,
      dayPrice: Number.isFinite(d) ? d : plan.dayPrice,
      nightPrice: Number.isFinite(n) ? n : plan.nightPrice,
      dayStart: dayStart.trim() || plan.dayStart,
      dayEnd: dayEnd.trim() || plan.dayEnd,
      description: description.trim() || plan.description,
      stationsCount: Number.isFinite(sc) ? sc : plan.stationsCount,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const fieldClass = `mt-1 ${appInputCompactClass}`;

  return (
    <AppCard className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
          <p className="text-xs text-gray-500">ID: {plan.id}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-gray-700">Назва плану</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Станцій (демо)</label>
          <input value={stationsCount} onChange={(e) => setStationsCount(e.target.value)} className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">☀ Денний тариф</p>
          <p className="mt-2 text-sm text-gray-600">грн/кВт·год</p>
          <input value={dayPrice} onChange={(e) => setDayPrice(e.target.value)} className={fieldClass} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Початок</label>
              <input value={dayStart} onChange={(e) => setDayStart(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Кінець</label>
              <input value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className={fieldClass} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-600 p-4 text-white shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">🌙 Нічний тариф</p>
          <p className="mt-2 text-sm text-sky-100">грн/кВт·год</p>
          <input
            value={nightPrice}
            onChange={(e) => setNightPrice(e.target.value)}
            className="mt-1 w-full rounded-xl border border-sky-400/50 bg-sky-500/40 px-3 py-2 text-sm text-white outline-none placeholder:text-sky-200 focus:ring-2 focus:ring-white/30"
          />
          <p className="mt-3 text-xs text-sky-100">Нічний інтервал — доповнення до денного вікна.</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Опис</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`${fieldClass} resize-none`}
        />
      </div>

      {saved ? (
        <p className="text-sm text-emerald-700">Збережено локально (демо).</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-emerald-100/80 pt-4">
        <PrimaryButton type="button" onClick={handleSave}>
          Зберегти план
        </PrimaryButton>
        <OutlineButton
          type="button"
          onClick={() => {
            setName(plan.name);
            setDayPrice(String(plan.dayPrice));
            setNightPrice(String(plan.nightPrice));
            setDayStart(plan.dayStart);
            setDayEnd(plan.dayEnd);
            setDescription(plan.description);
            setStationsCount(String(plan.stationsCount));
          }}
        >
          Скинути
        </OutlineButton>
      </div>
    </AppCard>
  );
}

export default function GlobalTariffsPage() {
  const { tariffPlans, updateTariffPlan } = useGlobalAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Тарифні плани</h1>
        <p className="mt-1 text-sm text-gray-500">
          Редагування умов нарахування (демо в пам&apos;яті). Візуально — як блоки денний/нічний з макетів.
        </p>
      </div>

      <div className="space-y-6">
        {tariffPlans.map((p) => (
          <TariffEditor key={p.id} plan={p} onSave={(patch) => updateTariffPlan(p.id, patch)} />
        ))}
      </div>
    </div>
  );
}
