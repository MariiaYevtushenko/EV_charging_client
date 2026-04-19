import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appFormInputClass } from '../../components/station-admin/formStyles';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';

export default function UserCarEditPage() {
  const { carId } = useParams<{ carId: string }>();
  const { cars, updateCar } = useUserPortal();
  const navigate = useNavigate();
  const car = cars.find((c) => c.id === carId);

  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');

  useEffect(() => {
    if (!car) return;
    setPlate(car.plate);
    setModel(car.model);
  }, [car]);

  const previewSrc = useMemo(() => suggestCarImageByModel(model), [model]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!carId || !car || !plate.trim() || !model.trim()) return;
    updateCar(carId, {
      plate: plate.trim(),
      model: model.trim(),
      connector: 'Type 2',
      imageUrl: undefined,
    });
    navigate('/dashboard/cars');
  };

  if (!carId || !car) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Link to="/dashboard/cars" className="text-sm font-medium text-green-700 hover:underline">
          ← До моїх авто
        </Link>
        <AppCard className="py-12 text-center text-sm text-gray-500">Авто не знайдено.</AppCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link to="/dashboard/cars" className="text-sm font-medium text-green-700 hover:underline">
        ← До моїх авто
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Редагувати авто</h1>
        <p className="mt-1 text-sm text-gray-500">
          Зображення оновлюється автоматично, коли ви змінюєте назву моделі.
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="edit-car-model" className="text-sm font-medium text-gray-700">
              Модель
            </label>
            <input
              id="edit-car-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Наприклад, Tesla Model 3"
              className={appFormInputClass}
            />
          </div>
          <div>
            <label htmlFor="edit-car-plate" className="text-sm font-medium text-gray-700">
              Державний номер
            </label>
            <input
              id="edit-car-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="KA 0000 AA"
              className={appFormInputClass}
            />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <PrimaryButton type="submit">Зберегти зміни</PrimaryButton>
            <OutlineButton type="button" onClick={() => navigate('/dashboard/cars')}>
              Скасувати
            </OutlineButton>
          </div>
        </form>
      </AppCard>
    </div>
  );
}
