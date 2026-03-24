import { apiBaseUrl } from "../lib/apiBase";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const base = apiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const o =
      typeof body === "object" && body !== null
        ? (body as { error?: unknown; message?: unknown })
        : null;
    const errPart =
      typeof o?.error === "string" ? o.error : res.statusText;
    const detail =
      typeof o?.message === "string" && o.message.trim() !== ""
        ? o.message
        : null;
    const msg =
      detail && errPart && detail !== errPart
        ? `${errPart}: ${detail}`
        : detail ?? errPart;
    throw new ApiError(msg || "Request failed", res.status, body);
  }
  return body as T;
}
