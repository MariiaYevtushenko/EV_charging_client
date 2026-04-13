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

function buildUrl(path: string): string {
  const base = apiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function throwIfFailed(res: Response, body: unknown): void {
  if (res.ok) return;
  const o =
    typeof body === "object" && body !== null
      ? (body as { error?: unknown; message?: unknown })
      : null;
  const errPart = typeof o?.error === "string" ? o.error : res.statusText;
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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  throwIfFailed(res, body);
  return body as T;
}

export function getJson<T>(path: string): Promise<T> {
  return fetchJson<T>(path);
}

export function postJson<T>(path: string, payload: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function putJson<T>(path: string, payload: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function patchJson<T>(path: string, payload: unknown): Promise<T> {
  return fetchJson<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteJson(path: string): Promise<void> {
  const res = await fetch(buildUrl(path), { method: "DELETE" });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  throwIfFailed(res, body);
}
