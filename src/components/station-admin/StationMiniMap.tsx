import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import type { StationStatus } from '../../types/station';

import 'leaflet/dist/leaflet.css';

const TILE = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

const PIN: Record<StationStatus, string> = {
  working: '#16a34a',
  maintenance: '#f59e0b',
  offline: '#9ca3af',
};

function miniIcon(status: StationStatus) {
  const c = PIN[status];
  return L.divIcon({
    className: 'station-leaflet-icon',
    html: `<div style="width:18px;height:18px;background:${c};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function StationMiniMap({
  lat,
  lng,
  status,
  label,
}: {
  lat: number;
  lng: number;
  status: StationStatus;
  label: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 ring-1 ring-gray-100">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        className="station-leaflet-map z-0 h-[200px] w-full sm:h-[220px]"
        scrollWheelZoom={false}
        dragging
        doubleClickZoom={false}
        zoomControl
      >
        <TileLayer attribution={TILE.attribution} url={TILE.url} subdomains="abcd" maxZoom={20} />
        <Marker position={[lat, lng]} icon={miniIcon(status)} title={label} />
      </MapContainer>
      <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Розташування станції (OpenStreetMap)
      </p>
    </div>
  );
}
