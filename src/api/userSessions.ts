import { postJson } from './http';

/** POST /api/user/:userId/sessions — тіло як у userController.createSession */
export function createUserSession(userId: number, body: Record<string, unknown>) {
  return postJson<unknown>(`/api/user/${userId}/sessions`, body);
}

/** POST /api/user/:userId/sessions/:sessionId/complete — завершити ACTIVE, bill через тригер */
export function completeUserSession(userId: number, sessionId: number, body: { kwhConsumed: number }) {
  return postJson<unknown>(`/api/user/${userId}/sessions/${sessionId}/complete`, body);
}
