import { deleteJson, getJson, postJson } from "./http";
import type { VehicleApiRow } from "./userVehicles";
import { fetchUserProfile } from "./authApi";
import type { UserBillApiRow, UserBookingApiRow, UserSessionApiRow } from "./userPortalMappers";

export { fetchUserProfile };

/** GET /api/user/:userId/vehicles */
export function fetchUserVehicles(userId: number) {
  return getJson<VehicleApiRow[]>(`/api/user/${userId}/vehicles`);
}

/** GET /api/user/:userId/bookings */
export function fetchUserBookings(userId: number) {
  return getJson<UserBookingApiRow[]>(`/api/user/${userId}/bookings`);
}

/** POST /api/user/:userId/bookings */
export function createUserBooking(userId: number, body: Record<string, unknown>) {
  return postJson<UserBookingApiRow>(`/api/user/${userId}/bookings`, body);
}

/** DELETE /api/user/:userId/bookings/:bookingId */
export function deleteUserBooking(userId: number, bookingId: number) {
  return deleteJson(`/api/user/${userId}/bookings/${bookingId}`);
}

/** GET /api/user/:userId/sessions — сесії з назвою станції та bill. */
export function fetchUserSessions(userId: number) {
  return getJson<UserSessionApiRow[]>(`/api/user/${userId}/sessions`);
}

/** GET /api/user/:userId/payments — рахунки (bill). */
export function fetchUserPayments(userId: number) {
  return getJson<UserBillApiRow[]>(`/api/user/${userId}/payments`);
}

/** POST /api/user/:userId/payments/:paymentId/pay — підтвердити оплату очікуючого рахунку (демо). */
export function postUserPayBill(
  userId: number,
  paymentId: number,
  body: { paymentMethod: 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' }
) {
  return postJson<UserBillApiRow>(`/api/user/${userId}/payments/${paymentId}/pay`, body);
}
