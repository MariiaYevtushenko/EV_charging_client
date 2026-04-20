import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { userCarInitialBrandModel } from '../../api/userVehicles';

const labelClass = 'text-sm font-medium text-slate-700';

function inputClass(err: boolean) {
  return `${appFormInputClass} ${err ? appFormInputErrorModifier : ''}`;
}

function UserCarEditForm({ car, carId }: { car: UserCar; carId: string }) {
  const { updateCar } = useUserPortal();
  const navigate = useNavigate();
  const [brand, setBrand] = useState(() => userCarInitialBrandModel(car).brand);
  const [vehicleModel, setVehicleModel] = useState(() => userCarInitialBrandModel(car).vehicleModel);
  const [plate, setPlate] = useState(() => car.plate);
  const [attempted, setAttempted] = useState(false);

  const modelLine = useMemo(() => `${brand} ${vehicleModel}`.trim(), [brand, vehicleModel]);
  const previewSrc = useMemo(() => suggestCarImageByModel(modelLine), [modelLine]);

  const fieldErrors: CarFormErrors = useMemo(
    () => validateEditCarForm({ brand, vehicleModel, plate }),
    [brand, vehicleModel, plate]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (hasCarFormErrors(fieldErrors)) return;
    const brandT = brand.trim();
    const vmT = vehicleModel.trim();
    const model = `${brandT} ${vmT}`.trim();
    updateCar(carId, {
      plate: plate.trim(),
      brand: brandT,
      vehicleModel: vmT,
      model,
      connector: car.connector || 'Type 2',
      imageUrl: undefined,
    });
    navigate('/dashboard/cars');
  };

  return (
    <UserCarFormShell
      title="Редагувати авто"
      description="Оновіть бренд, модель або номер. Зображення на картці підбирається за повною назвою."
      previewSrc={previewSrc}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
            <p className="mt-1.5 text-xs text-slate-500">Латиниця або кирилиця, цифри; пробіли за бажанням.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-emerald-100/80 pt-6">
          <PrimaryButton type="submit">Зберегти зміни</PrimaryButton>
          <OutlineButton type="button" onClick={() => navigate('/dashboard/cars')}>
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
