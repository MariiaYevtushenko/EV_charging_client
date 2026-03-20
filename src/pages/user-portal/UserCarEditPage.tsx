import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appSelectClass } from '../../components/station-admin/formStyles';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';

const CONNECTORS = ['Type 2', 'CCS2', 'CHAdeMO'] as const;

const inputClass =
  'mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20';

export default function UserCarEditPage() {
  const { carId } = useParams<{ carId: string }>();
  const { cars, updateCar } = useUserPortal();
  const navigate = useNavigate();
  const car = cars.find((c) => c.id === carId);

  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [connector, setConnector] = useState<string>('Type 2');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!car) return;
    setPlate(car.plate);
    setModel(car.model);
    setConnector(car.connector);
    setImageUrl(car.imageUrl?.trim() ?? '');
  }, [car]);

  const previewSrc = imageUrl.trim() || (model.trim() ? suggestCarImageByModel(model) : DEFAULT_CAR_IMAGE);

  const handleSuggest = () => {
    setImageUrl(suggestCarImageByModel(model));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!carId || !car || !plate.trim() || !model.trim()) return;
    updateCar(carId, {
      plate: plate.trim(),
      model: model.trim(),
      connector,
      imageUrl: imageUrl.trim() || suggestCarImageByModel(model.trim()),
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
          Оновіть модель, номер, конектор або фото — як при додаванні нового авто.
        </p>
      </div>

      <AppCard>
        <div className="overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200">
          <div className="aspect-[16/10] w-full">
            <img src={previewSrc} alt="" className="h-full w-full object-cover" />
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
              className={inputClass}
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
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="edit-car-conn" className="text-sm font-medium text-gray-700">
              Конектор
            </label>
            <select
              id="edit-car-conn"
              value={connector}
              onChange={(e) => setConnector(e.target.value)}
              className={`${inputClass} ${appSelectClass}`}
            >
              {CONNECTORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-car-img" className="text-sm font-medium text-gray-700">
              URL фото (необов’язково)
            </label>
            <input
              id="edit-car-img"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              type="url"
              className={inputClass}
            />
            <div className="mt-2">
              <OutlineButton type="button" className="!text-xs" onClick={handleSuggest}>
                Підібрати фото за моделлю
              </OutlineButton>
            </div>
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
