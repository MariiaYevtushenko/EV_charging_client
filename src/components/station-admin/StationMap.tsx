import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Station, StationStatus } from '../../types/station';
import { formatCountryLabel } from '../../utils/countryDisplay';

import 'leaflet/dist/leaflet.css';

const TILE = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

const LVIV_FALLBACK = L.latLngBounds([49.78, 23.92], [49.9, 24.22]);

/** Межі видимої області Leaflet → query для /api/stations/map */
export type MapViewportBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
};

const DEFAULT_CENTER: L.LatLngTuple = [49.5, 31.5];
const DEFAULT_ZOOM_VIEWPORT = 6;

const STATUS_UI: Record<
  StationStatus,
  { fill: string; stroke: string; dot: string; badgeBg: string; badgeText: string; short: string }
> = {
  working: {
    fill: '#16a34a',
    stroke: '#14532d',
    dot: '#ffffff',
    badgeBg: '#dcfce7',
    badgeText: '#166534',
    short: 'Актив',
  },
  maintenance: {
    fill: '#f59e0b',
    stroke: '#b45309',
    dot: '#ffffff',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    short: 'Сервіс',
  },
  offline: {
    fill: '#9ca3af',
    stroke: '#4b5563',
    dot: '#f9fafb',
    badgeBg: '#f3f4f6',
    badgeText: '#374151',
    short: 'Вимк',
  },
  archived: {
    fill: '#9ca3af',
    stroke: '#4b5563',
    dot: '#f9fafb',
    badgeBg: '#f3f4f6',
    badgeText: '#374151',
    short: 'Архівовано',
  },
};

function stationDivIcon(status: StationStatus, selected: boolean) {
  const u = STATUS_UI[status];
  const scale = selected ? 1.08 : 1;
  const ring = selected
    ? 'filter:drop-shadow(0 0 0 2px #fff) drop-shadow(0 0 0 4px #16a34a) drop-shadow(0 4px 12px rgb(0 0 0 / .25));'
    : 'filter:drop-shadow(0 3px 10px rgb(0 0 0 / .22));';

  const html = `
<div style="width:56px;height:56px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;transform:scale(${scale});transform-origin:50% 100%;${ring}">
  <div style="margin-bottom:4px;padding:2px 4px;border-radius:9999px;font-size:6px;font-weight:800;line-height:1;letter-spacing:0.02em;background:${u.badgeBg};color:${u.badgeText};border:1px solid rgba(0,0,0,.06);white-space:nowrap;max-width:56px;overflow:hidden;text-overflow:ellipsis;">
    ${u.short}
  </div>
  <div style="display:flex;align-items:flex-start;justify-content:center;height:40px;">
    <svg width="34" height="40" viewBox="0 0 24 32" aria-hidden="true" style="display:block">
      <path d="M12 32C12 32 23 18.5 23 12C23 5.9 18.1 1 12 1S1 5.9 1 12C1 18.5 12 32 12 32Z" fill="${u.fill}" stroke="${u.stroke}" stroke-width="1.75"/>
      <circle cx="12" cy="11.5" r="3.5" fill="${u.dot}"/>
    </svg>
  </div>
</div>`;

  return L.divIcon({
    className: 'station-leaflet-icon',
    html,
    iconSize: [48, 54],
    iconAnchor: [24, 54],
    popupAnchor: [0, -48],
  });
}

const iconCache = new Map<string, L.DivIcon>();
function getIcon(status: StationStatus, selected: boolean) {
  const key = `${status}:${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = stationDivIcon(status, selected);
    iconCache.set(key, icon);
  }
  return icon;
}

function ViewportReporter({ onViewportChange }: { onViewportChange: (b: MapViewportBounds) => void }) {
  const map = useMap();

  const report = useCallback(() => {
    const b = map.getBounds();
    onViewportChange({
      south: b.getSouth(),
      north: b.getNorth(),
      west: b.getWest(),
      east: b.getEast(),
    });
  }, [map, onViewportChange]);

  useEffect(() => {
    map.whenReady(() => {
      report();
    });
    map.on('moveend', report);
    map.on('zoomend', report);
    return () => {
      map.off('moveend', report);
      map.off('zoomend', report);
    };
  }, [map, report]);

  return null;
}

function FitStationsBounds({ stations }: { stations: Station[] }) {
  const map = useMap();
  const skipFirst = useRef(true);

  const signature = useMemo(() => {
    if (stations.length === 0) return 'empty';
    const sorted = [...stations].sort((a, b) => a.id.localeCompare(b.id));
    return sorted.map((s) => `${s.id}:${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join('|');
  }, [stations]);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (stations.length === 0) {
      map.fitBounds(LVIV_FALLBACK, { padding: [48, 48], maxZoom: 12, animate: true });
      return;
    }
    const b = L.latLngBounds(stations.map((s) => [s.lat, s.lng] as L.LatLngTuple));
    map.fitBounds(b, {
      padding: [52, 52],
      maxZoom: stations.length === 1 ? 15 : 14,
      animate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature]);

  return null;
}

export default function StationMap({
  stations,
  selectedId,
  onSelect,
  onViewportChange,
  stationDetailPath,
}: {
  stations: Station[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Якщо задано — підвантаження станцій по bbox; без підгонки карти під усі маркери при кожному оновленні даних. */
  onViewportChange?: (bounds: MapViewportBounds) => void;
  /** Посилання в спливаючій підказці маркера (наприклад `/station-dashboard/stations/:id`). */
  stationDetailPath?: (stationId: string) => string;
}) {
  const viewportMode = Boolean(onViewportChange);

  const initialBounds = useMemo(() => {
    if (stations.length === 0) return LVIV_FALLBACK;
    return L.latLngBounds(stations.map((s) => [s.lat, s.lng] as L.LatLngTuple));
  }, [stations]);

  if (viewportMode) {
    return (
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM_VIEWPORT}
        className="station-leaflet-map z-0 h-full min-h-[360px] w-full overflow-hidden rounded-2xl"
        scrollWheelZoom
      >
        <TileLayer attribution={TILE.attribution} url={TILE.url} subdomains="abcd" maxZoom={20} />
        <ViewportReporter onViewportChange={onViewportChange!} />
        {stations.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={getIcon(s.status, s.id === selectedId)}
            zIndexOffset={s.id === selectedId ? 800 : 0}
            eventHandlers={{ click: () => onSelect(s.id) }}
          >
            <Popup>
              <div className="min-w-[200px] max-w-[260px]">
                <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {[s.city, formatCountryLabel(s.country)].filter(Boolean).join(' · ') || '—'}
                </p>
                {stationDetailPath ? (
                  <Link
                    to={stationDetailPath(s.id)}
                    className="mt-2 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Відкрити станцію
                  </Link>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    );
  }

  return (
    <MapContainer
      bounds={initialBounds}
      boundsOptions={{ padding: [40, 40], maxZoom: 14 }}
      className="station-leaflet-map z-0 h-full min-h-[360px] w-full overflow-hidden rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer attribution={TILE.attribution} url={TILE.url} subdomains="abcd" maxZoom={20} />
      <FitStationsBounds stations={stations} />
      {stations.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={getIcon(s.status, s.id === selectedId)}
          zIndexOffset={s.id === selectedId ? 800 : 0}
          eventHandlers={{ click: () => onSelect(s.id) }}
        >
          <Popup>
            <div className="min-w-[200px] max-w-[260px]">
              <p className="text-sm font-semibold text-gray-900">{s.name}</p>
              <p className="mt-0.5 text-xs text-gray-600">
                {[s.city, formatCountryLabel(s.country)].filter(Boolean).join(' · ') || '—'}
              </p>
              {stationDetailPath ? (
                <Link
                  to={stationDetailPath(s.id)}
                  className="mt-2 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  Відкрити станцію
                </Link>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
