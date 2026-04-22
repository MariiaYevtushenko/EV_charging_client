import { useEffect, useState } from 'react';
import { fetchStationTariffsToday, type TodayGridTariffsDto } from '../api/stations';

/** Тарифи мережі з таблиці `tariff` на поточний календарний день (актуальні рядки з БД). */
export function useTodayGridTariffsFromDb() {
  const [data, setData] = useState<TodayGridTariffsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStationTariffsToday()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError('Не вдалося завантажити тарифи з БД');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
