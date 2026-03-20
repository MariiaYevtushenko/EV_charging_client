import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: L.LatLngTuple = [49.8397, 24.0297];

const TILE = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

/** Координати = центр карти; оновлюється після панорамування/зуму. */
function CenterOfMapReporter({
  onCenter,
}: {
  onCenter: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const onCenterRef = useRef(onCenter);
  onCenterRef.current = onCenter;

  useEffect(() => {
    const report = () => {
      const c = map.getCenter();
      onCenterRef.current(
        parseFloat(c.lat.toFixed(6)),
        parseFloat(c.lng.toFixed(6))
      );
    };
    map.on('moveend', report);
    map.whenReady(() => {
      setTimeout(report, 0);
    });
    return () => {
      map.off('moveend', report);
    };
  }, [map]);

  return null;
}

/** Підлітає до точки лише коли збільшується flyToKey (геокод / кнопка / застосувати поля). */
function FlyToCenter({
  lat,
  lng,
  zoom,
  flyToKey,
}: {
  lat: number;
  lng: number;
  zoom: number;
  flyToKey: number;
}) {
  const map = useMap();
  const posRef = useRef({ lat, lng });
  posRef.current = { lat, lng };
  useEffect(() => {
    if (flyToKey <= 0) return;
    const { lat: la, lng: lo } = posRef.current;
    map.flyTo([la, lo], zoom, { duration: 0.55 });
  }, [flyToKey, map, zoom]);
  return null;
}

function FixedCenterPin() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center"
      aria-hidden
    >
      {/* Зміщення вгору: кінчик «краплі» на перетині центру карти */}
      <div className="-mt-7 flex flex-col items-center">
        <svg width="44" height="52" viewBox="0 0 48 56" fill="none" className="drop-shadow-lg">
          <path
            d="M24 52C24 52 44 30 44 20C44 9.85 35.15 1 24 1S4 9.85 4 20C4 30 24 52 24 52Z"
            fill="#2563eb"
            stroke="#1d4ed8"
            strokeWidth="2"
          />
          <circle cx="24" cy="20" r="6" fill="white" />
        </svg>
        <div className="-mt-1 h-px w-8 rounded-full bg-gray-900/25" />
      </div>
    </div>
  );
}

export default function StationLocationPicker({
  lat,
  lng,
  onPositionChange,
  flyToKey,
  mapClassName = 'h-[280px] w-full sm:h-[320px]',
}: {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  /** Після геокоду / «Центрувати» / зміни координат у полях */
  flyToKey: number;
  /** Tailwind-класи висоти карти (напр. на сторінці «Нова станція» — вища колонка зліва) */
  mapClassName?: string;
}) {
  /** Не прив’язуємо MapContainer до поточних lat/lng — інакше кожен moveend перезаписував би вид карти. */
  const [initialCenter] = useState<L.LatLngTuple>(() =>
    Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : DEFAULT_CENTER
  );

  const onCenter = useCallback(
    (la: number, lo: number) => {
      onPositionChange(la, lo);
    },
    [onPositionChange]
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 ring-1 ring-gray-100">
      <MapContainer
        center={initialCenter}
        zoom={15}
        className={`station-leaflet-map z-0 ${mapClassName}`}
        scrollWheelZoom
      >
        <TileLayer attribution={TILE.attribution} url={TILE.url} subdomains="abcd" maxZoom={20} />
        <CenterOfMapReporter onCenter={onCenter} />
        <FlyToCenter lat={lat} lng={lng} zoom={16} flyToKey={flyToKey} />
      </MapContainer>
      <FixedCenterPin />
      <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Пересувайте карту: точка зарядки — у центрі (синій маркер). Координати беруться з центру видимої
        області.
      </p>
    </div>
  );
}
