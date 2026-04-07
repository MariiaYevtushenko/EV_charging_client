/** Геокодування через публічний API Nominatim (OpenStreetMap). Для продакшену краще проксі на бекенді. */

export type GeocodeResult =
  | { ok: true; lat: number; lng: number; displayName?: string }
  | { ok: false; message: string };

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

export type ReverseGeocodeResult =
  | { ok: true; city: string; address: string; displayName?: string }
  | { ok: false; message: string };

function buildStreetLine(addr: Record<string, string | undefined>): string {
  const road = addr.road || addr.pedestrian || addr.footway || addr.path || '';
  const num = addr.house_number || '';
  const line = [road, num].filter(Boolean).join(' ').trim();
  if (line) return line;
  const fallback = addr.amenity || addr.shop || addr.building || addr.neighbourhood || '';
  return fallback.trim();
}

function buildCity(addr: Record<string, string | undefined>): string {
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.city_district ||
    addr.county ||
    ''
  ).trim();
}

/** Адреса та місто за координатами (центр карти). */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    zoom: '18',
    'accept-language': 'uk,en',
  });

  try {
    const res = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return { ok: false, message: `Сервіс геокодування відповів з помилкою (${res.status}).` };
    }
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const city = buildCity(a);
    let address = buildStreetLine(a);
    if (!address && data.display_name) {
      const parts = data.display_name.split(',').map((s) => s.trim());
      address = parts.slice(0, 2).join(', ') || '—';
    }
    if (!address) address = '—';

    return {
      ok: true,
      city: city || '—',
      address,
      displayName: data.display_name,
    };
  } catch {
    return {
      ok: false,
      message: 'Не вдалося отримати адресу за координатами.',
    };
  }
}

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
