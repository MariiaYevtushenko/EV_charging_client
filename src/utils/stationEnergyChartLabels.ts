import type { StationEnergyPeriod } from '../types/stationApi';

/** Підпис осі X для графіків аналітики енергії станції. */
export function formatStationEnergyChartAxisLabel(iso: string, period: StationEnergyPeriod): string {
  const d = new Date(iso);
  if (period === '1d') {
    return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  }
  if (period === '7d') {
    return d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}
