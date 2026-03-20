import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserPortal } from '../../context/UserPortalContext';
import { AppCard, OutlineButton, PrimaryButton } from '../../components/station-admin/Primitives';
import { appSelectClass } from '../../components/station-admin/formStyles';
import { DEFAULT_CAR_IMAGE, suggestCarImageByModel } from '../../utils/carImageSuggest';

const CONNECTORS = ['Type 2', 'CCS2', 'CHAdeMO'] as const;

const inputClass =
  'mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20';

export default function UserCarNewPage() {
  const { addCar } = useUserPortal();
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [connector, setConnector] = useState<string>('Type 2');
  const [imageUrl, setImageUrl] = useState('');

  const previewSrc = imageUrl.trim() || DEFAULT_CAR_IMAGE;

  const handleSuggest = () => {
    setImageUrl(suggestCarImageByModel(model));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !model.trim()) return;
    addCar({
      plate: plate.trim(),
      model: model.trim(),
      connector,
      imageUrl: imageUrl.trim() || suggestCarImageByModel(model.trim()),
    });
    navigate('/dashboard/cars');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link to="/dashboard/cars" className="text-sm font-medium text-green-700 hover:underline">
        ← До моїх авто
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Додати авто</h1>
        <p className="mt-1 text-sm text-gray-500">
          Модель, номер, конектор. Фото можна підібрати за ключовими словами в назві або вставити посилання.
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
            <label htmlFor="new-car-model" className="text-sm font-medium text-gray-700">
              Модель
            </label>
            <input
              id="new-car-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Наприклад, Tesla Model 3"
              className={inputClass}
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
              placeholder="KA 0000 AA"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-car-conn" className="text-sm font-medium text-gray-700">
              Конектор
            </label>
            <select
              id="new-car-conn"
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
            <label htmlFor="new-car-img" className="text-sm font-medium text-gray-700">
              URL фото (необов’язково)
            </label>
            <input
              id="new-car-img"
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
            <PrimaryButton type="submit">Зберегти</PrimaryButton>
            <OutlineButton type="button" onClick={() => navigate('/dashboard/cars')}>
              Скасувати
            </OutlineButton>
          </div>
        </form>
      </AppCard>
    </div>
  );
}
