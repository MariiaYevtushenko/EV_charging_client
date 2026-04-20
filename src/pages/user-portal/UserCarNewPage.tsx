import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass, appFormInputErrorModifier } from '../../components/station-admin/formStyles';
import { suggestCarImageByModel } from '../../utils/carImageSuggest';
import {
  hasCarFormErrors,
  validateNewCarForm,
  type CarFormErrors,
} from '../../utils/carFormValidation';
import { fetchUserVehicles } from '../../api/userReads';
import { mapVehicleApiRowToUserCar, postUserVehicle } from '../../api/userVehicles';
import { ApiError } from '../../api/http';
import { UserCarFormShell } from '../../components/user-portal/UserCarFormShell';

const labelClass = 'text-sm font-medium text-slate-700';

function inputClass(err: boolean) {
  return `${appFormInputClass} ${err ? appFormInputErrorModifier : ''}`;
}

export default function UserCarNewPage() {
  const { user } = useAuth();
  const { replaceCars } = useUserPortal();
  const navigate = useNavigate();
  const [brand, setBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [plate, setPlate] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('60');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const modelLine = useMemo(() => `${brand} ${vehicleModel}`.trim(), [brand, vehicleModel]);
  const previewSrc = useMemo(() => suggestCarImageByModel(modelLine), [modelLine]);

  const fieldErrors: CarFormErrors = useMemo(
    () => validateNewCarForm({ brand, vehicleModel, plate, batteryCapacity }),
    [brand, vehicleModel, plate, batteryCapacity]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setAttempted(true);
    if (hasCarFormErrors(fieldErrors)) return;

    if (!user?.id) {
      setError('Увійдіть у систему, щоб додати авто.');
      return;
    }
    const uid = Number(user.id);
    if (!Number.isFinite(uid)) {
      setError('Некоректний профіль користувача.');
      return;
    }

    const bStr = brand.trim();
    const mStr = vehicleModel.trim();
    const plateStr = plate.trim();
    const bat = Number(batteryCapacity.replace(',', '.'));

    setSubmitting(true);
    try {
      await postUserVehicle(uid, {
        licensePlate: plateStr,
        brand: bStr,
        vehicleModel: mStr,
        batteryCapacity: bat,
      });
      const rows = await fetchUserVehicles(uid);
      replaceCars(rows.map((r) => mapVehicleApiRowToUserCar(r)));
      navigate('/dashboard/cars');
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не вдалося зберегти';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserCarFormShell
      title="Додати авто"
      description="Ілюстрація на картці підбирається за брендом і моделлю під час введення. Усі поля обов’язкові."
      previewSrc={previewSrc}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <label htmlFor="new-car-brand" className={labelClass}>
            Бренд <span className="text-red-500">*</span>
          </label>
          <input
            id="new-car-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Nissan"
            autoComplete="organization"
            className={inputClass(attempted && Boolean(fieldErrors.brand))}
            aria-invalid={attempted && Boolean(fieldErrors.brand)}
            aria-describedby={attempted && fieldErrors.brand ? 'new-car-brand-err' : undefined}
          />
          {attempted && fieldErrors.brand ? (
            <p id="new-car-brand-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.brand}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="new-car-model" className={labelClass}>
            Модель <span className="text-red-500">*</span>
          </label>
          <input
            id="new-car-model"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            placeholder="Leaf"
            autoComplete="off"
            className={inputClass(attempted && Boolean(fieldErrors.vehicleModel))}
            aria-invalid={attempted && Boolean(fieldErrors.vehicleModel)}
            aria-describedby={attempted && fieldErrors.vehicleModel ? 'new-car-model-err' : undefined}
          />
          {attempted && fieldErrors.vehicleModel ? (
            <p id="new-car-model-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.vehicleModel}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="new-car-plate" className={labelClass}>
            Державний номер <span className="text-red-500">*</span>
          </label>
          <input
            id="new-car-plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="AA 1111 BB"
            autoComplete="off"
            className={inputClass(attempted && Boolean(fieldErrors.plate))}
            aria-invalid={attempted && Boolean(fieldErrors.plate)}
            aria-describedby={attempted && fieldErrors.plate ? 'new-car-plate-err' : undefined}
          />
          {attempted && fieldErrors.plate ? (
            <p id="new-car-plate-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.plate}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">Латиниця або кирилиця, цифри; пробіли за бажанням.</p>
          )}
        </div>

        <div>
          <label htmlFor="new-car-bat" className={labelClass}>
            Ємність акумулятора (кВт·год) <span className="text-red-500">*</span>
          </label>
          <input
            id="new-car-bat"
            value={batteryCapacity}
            onChange={(e) => setBatteryCapacity(e.target.value)}
            inputMode="decimal"
            placeholder="60"
            className={inputClass(attempted && Boolean(fieldErrors.batteryCapacity))}
            aria-invalid={attempted && Boolean(fieldErrors.batteryCapacity)}
            aria-describedby={attempted && fieldErrors.batteryCapacity ? 'new-car-bat-err' : undefined}
          />
          {attempted && fieldErrors.batteryCapacity ? (
            <p id="new-car-bat-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.batteryCapacity}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">Типові значення: 40–100 кВт·год для легкових EV.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-emerald-100/80 pt-6">
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Збереження…' : 'Зберегти'}
          </PrimaryButton>
          <OutlineButton type="button" disabled={submitting} onClick={() => navigate('/dashboard/cars')}>
            Скасувати
          </OutlineButton>
        </div>
      </form>
    </UserCarFormShell>
  );
}
