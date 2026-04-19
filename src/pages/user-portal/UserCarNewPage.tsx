import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass } from '../../components/station-admin/formStyles';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';
import { fetchUserVehicles } from '../../api/userReads';
import { mapVehicleApiRowToUserCar, postUserVehicle } from '../../api/userVehicles';
import { ApiError } from '../../api/http';

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

  const modelLine = useMemo(() => `${brand} ${vehicleModel}`.trim(), [brand, vehicleModel]);
  const previewSrc = useMemo(() => suggestCarImageByModel(modelLine), [modelLine]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
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
    if (!bStr || !mStr || !plateStr) {
      setError('Заповніть бренд, модель та номер.');
      return;
    }
    if (!Number.isFinite(bat) || bat <= 0) {
      setError('Ємність акумулятора має бути додатним числом.');
      return;
    }

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
    <div className="mx-auto max-w-lg space-y-6">
      <Link to="/dashboard/cars" className="text-sm font-medium text-green-700 hover:underline">
        ← До моїх авто
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Додати авто</h1>
        <p className="mt-1 text-sm text-gray-500">
          Фото на картці підбирається автоматично за брендом і моделлю під час введення.
        </p>
      </div>

      <AppCard>
        <div className="overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200">
          <div className="aspect-[16/10] w-full">
            <img
              src={previewSrc}
              alt=""
              className="h-full w-full object-cover"
              onError={(ev) => {
                (ev.target as HTMLImageElement).src = DEFAULT_CAR_IMAGE;
              }}
            />
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          {error ? (
            <p className="rounded-xl border border-red-100 bg-red-50/90 px-3 py-2.5 text-sm text-red-700">{error}</p>
          ) : null}

          <div>
            <label htmlFor="new-car-brand" className="text-sm font-medium text-gray-700">
              Бренд
            </label>
            <input
              id="new-car-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Nissan"
              className={appFormInputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="new-car-model" className="text-sm font-medium text-gray-700">
              Модель
            </label>
            <input
              id="new-car-model"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Leaf"
              className={appFormInputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="new-car-plate" className="text-sm font-medium text-gray-700">
              Державний номер
            </label>
            <input
              id="new-car-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="AA 1111 BB"
              className={appFormInputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="new-car-bat" className="text-sm font-medium text-gray-700">
              Ємність акумулятора (кВт·год)
            </label>
            <input
              id="new-car-bat"
              value={batteryCapacity}
              onChange={(e) => setBatteryCapacity(e.target.value)}
              inputMode="decimal"
              className={appFormInputClass}
              required
            />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? 'Збереження…' : 'Зберегти'}
            </PrimaryButton>
            <OutlineButton type="button" disabled={submitting} onClick={() => navigate('/dashboard/cars')}>
              Скасувати
            </OutlineButton>
          </div>
        </form>
      </AppCard>
    </div>
  );
}
