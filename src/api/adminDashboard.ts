import { getJson } from './http';

/** GET /api/admin/dashboard — агрегати за поточну добу (час сервера). */
export type AdminDashboardSummary = {
  todaySessions: number;
  todayRevenueUah: number;
  todaySuccessfulPayments: number;
};

export function fetchAdminDashboard(): Promise<AdminDashboardSummary> {
  return getJson<AdminDashboardSummary>('/api/admin/dashboard');
}
