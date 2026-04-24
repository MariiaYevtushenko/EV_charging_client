import { getJson } from './http';

// 
export type AdminDashboardSummary = {
  todaySessions: number;
  todayRevenueUah: number;
  todaySuccessfulPayments: number;
  activeSessions: number;
};

export function fetchAdminDashboard(): Promise<AdminDashboardSummary> {
  return getJson<AdminDashboardSummary>('/api/admin/dashboard');
}
