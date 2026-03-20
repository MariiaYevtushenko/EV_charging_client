/** Геокодування через публічний API Nominatim (OpenStreetMap). Для продакшену краще проксі на бекенді. */

export type GeocodeResult =
  | { ok: true; lat: number; lng: number; displayName?: string }
  | { ok: false; message: string };

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddressParts(address: string, city: string): Promise<GeocodeResult> {
  const parts = [address.trim(), city.trim(), 'Україна'].filter(Boolean);
  if (parts.length < 2) {
    return { ok: false, message: 'Заповніть місто та адресу для пошуку координат.' };
  }
  const q = parts.join(', ');
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
    countrycodes: 'ua',
  });

  try {
    const res = await fetch(`${NOMINATIM_SEARCH}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'uk,en',
      },
    });
    if (!res.ok) {
      return { ok: false, message: `Сервіс геокодування відповів з помилкою (${res.status}).` };
    }
    const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const hit = data[0];
    if (!hit?.lat || !hit?.lon) {
      return {
        ok: false,
        message: 'Точку не знайдено. Спробуйте іншу формулювання або вкажіть місце на карті.',
      };
    }
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, message: 'Некоректна відповідь сервісу геокодування.' };
    }
    return { ok: true, lat, lng, displayName: hit.display_name };
  } catch {
    return {
      ok: false,
      message:
        'Не вдалося звернутися до Nominatim (мережа або обмеження браузера). Вкажіть точку на карті вручну.',
    };
  }
}
