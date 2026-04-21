import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass, appFormInputErrorModifier } from '../../components/station-admin/formStyles';
import { suggestCarImageByModel } from '../../utils/carImageSuggest';
import {
  hasCarFormErrors,
  validateEditCarForm,
  type CarFormErrors,
} from '../../utils/carFormValidation';
import { UserCarFormShell } from '../../components/user-portal/UserCarFormShell';
import type { UserCar } from '../../types/userPortal';
import { fetchUserVehicles } from '../../api/userReads';
import {
  mapVehicleApiRowToUserCar,
  putUserVehicle,
  userCarBatteryCapacityInput,
  userCarInitialBrandModel,
} from '../../api/userVehicles';
import { ApiError } from '../../api/http';

const labelClass = 'text-sm font-medium text-gray-700';

function inputClass(err: boolean) {
  return `${appFormInputClass} ${err ? appFormInputErrorModifier : ''}`;
}

function UserCarEditForm({ car, carId }: { car: UserCar; carId: string }) {
  const { user } = useAuth();
  const { replaceCars } = useUserPortal();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(() => userCarInitialBrandModel(car).brand);
  const [vehicleModel, setVehicleModel] = useState(() => userCarInitialBrandModel(car).vehicleModel);
  const [plate, setPlate] = useState(() => car.plate);
  const [batteryCapacity, setBatteryCapacity] = useState(() => userCarBatteryCapacityInput(car));
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const modelLine = useMemo(() => `${brand} ${vehicleModel}`.trim(), [brand, vehicleModel]);
  const previewSrc = useMemo(() => suggestCarImageByModel(modelLine), [modelLine]);
  const headerBrandModel = useMemo(() => userCarInitialBrandModel(car), [car]);

  const fieldErrors: CarFormErrors = useMemo(
    () => validateEditCarForm({ brand, vehicleModel, plate, batteryCapacity }),
    [brand, vehicleModel, plate, batteryCapacity]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setAttempted(true);
    if (hasCarFormErrors(fieldErrors)) return;
    const uid = user?.id != null ? Number(user.id) : NaN;
    const vid = Number(carId);
    if (!Number.isFinite(uid) || !Number.isFinite(vid)) {
      setError('Некоректний профіль або авто.');
      return;
    }
    const brandT = brand.trim();
    const vmT = vehicleModel.trim();
    const plateStr = plate.trim();
    const bat = Number(batteryCapacity.replace(',', '.'));
    setSubmitting(true);
    void (async () => {
      try {
        await putUserVehicle(uid, vid, {
          licensePlate: plateStr,
          brand: brandT,
          vehicleModel: vmT,
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
    })();
  };

  return (
    <UserCarFormShell
      title="Редагувати авто"
      description="Оновіть дані автомобіля. Зображення на картці підбирається за повною назвою моделі."
      previewSrc={previewSrc}
      rightColumnHeader={
        <div>
          <p className="text-base font-semibold text-gray-900">{headerBrandModel.brand}</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-800">{headerBrandModel.vehicleModel}</p>
          <p className="mt-1 font-mono text-sm tabular-nums tracking-wide text-gray-600">{car.plate}</p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="edit-car-brand" className={labelClass}>
            Бренд <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-car-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Nissan"
            autoComplete="organization"
            className={inputClass(attempted && Boolean(fieldErrors.brand))}
            aria-invalid={attempted && Boolean(fieldErrors.brand)}
            aria-describedby={attempted && fieldErrors.brand ? 'edit-car-brand-err' : undefined}
          />
          {attempted && fieldErrors.brand ? (
            <p id="edit-car-brand-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.brand}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="edit-car-vehicle-model" className={labelClass}>
            Модель <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-car-vehicle-model"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            placeholder="Leaf"
            autoComplete="off"
            className={inputClass(attempted && Boolean(fieldErrors.vehicleModel))}
            aria-invalid={attempted && Boolean(fieldErrors.vehicleModel)}
            aria-describedby={attempted && fieldErrors.vehicleModel ? 'edit-car-vehicle-model-err' : undefined}
          />
          {attempted && fieldErrors.vehicleModel ? (
            <p id="edit-car-vehicle-model-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.vehicleModel}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="edit-car-plate" className={labelClass}>
            Державний номер <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-car-plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="KA 0000 AA"
            autoComplete="off"
            className={inputClass(attempted && Boolean(fieldErrors.plate))}
            aria-invalid={attempted && Boolean(fieldErrors.plate)}
            aria-describedby={attempted && fieldErrors.plate ? 'edit-car-plate-err' : undefined}
          />
          {attempted && fieldErrors.plate ? (
            <p id="edit-car-plate-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.plate}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-500">Латиниця або кирилиця, цифри; пробіли за бажанням.</p>
          )}
        </div>

        <div>
          <label htmlFor="edit-car-bat" className={labelClass}>
            Ємність акумулятора (кВт·год) <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-car-bat"
            value={batteryCapacity}
            onChange={(e) => setBatteryCapacity(e.target.value)}
            inputMode="decimal"
            placeholder="60"
            className={inputClass(attempted && Boolean(fieldErrors.batteryCapacity))}
            aria-invalid={attempted && Boolean(fieldErrors.batteryCapacity)}
            aria-describedby={attempted && fieldErrors.batteryCapacity ? 'edit-car-bat-err' : undefined}
          />
          {attempted && fieldErrors.batteryCapacity ? (
            <p id="edit-car-bat-err" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.batteryCapacity}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-500">Типові значення: 40–100 кВт·год для легкових EV.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Збереження…' : 'Зберегти зміни'}
          </PrimaryButton>
          <OutlineButton type="button" disabled={submitting} onClick={() => navigate('/dashboard/cars')}>
            Скасувати
          </OutlineButton>
        </div>
      </form>
    </UserCarFormShell>
  );
}

export default function UserCarEditPage() {
  const { carId } = useParams<{ carId: string }>();
  const { cars } = useUserPortal();
  const car = cars.find((c) => c.id === carId);

  if (!carId || !car) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Link
          to="/dashboard/cars"
          className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          ← До моїх авто
        </Link>
        <AppCard className="border-dashed border-slate-200 py-14 text-center">
          <p className="text-sm font-medium text-slate-700">Авто не знайдено</p>
          <p className="mt-1 text-xs text-slate-500">Можливо, запис вже видалено з гаража.</p>
        </AppCard>
      </div>
    );
  }

  return <UserCarEditForm key={car.id} car={car} carId={carId} />;
}
