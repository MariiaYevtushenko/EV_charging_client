/** Порожній base = відносні URL (Vite proxy → localhost:3001). Інакше VITE_API_URL. */
export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  return raw?.replace(/\/$/, "") ?? "";
}
