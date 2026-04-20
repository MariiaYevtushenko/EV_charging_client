import type { PortStatus, StationStatus } from '../types/station';

export function stationStatusLabel(status: StationStatus): string {
  switch (status) {
    case 'working':
      return 'Працює';
    case 'offline':
      return 'Оффлайн';
    case 'maintenance':
      return 'Ремонт';
    case 'archived':
      return 'Архів';
    default:
      return status;
  }
}

export function stationStatusTone(
  status: StationStatus
): 'success' | 'warn' | 'muted' | 'dark' {
  switch (status) {
    case 'working':
      return 'success';
    case 'maintenance':
      return 'warn';
    case 'offline':
      return 'muted';
    case 'archived':
      return 'dark';
    default:
      return 'muted';
  }
}

export function portStatusLabel(status: PortStatus): string {
  switch (status) {
    case 'available':
      return 'Вільний';
    case 'busy':
      return 'Зайнятий';
    case 'offline':
      return 'Недоступний';
    default:
      return status;
  }
}

export function portStatusTone(status: PortStatus): 'success' | 'info' | 'muted' {
  switch (status) {
    case 'available':
      return 'success';
    case 'busy':
      return 'info';
    case 'offline':
      return 'muted';
    default:
      return 'muted';
  }
}
