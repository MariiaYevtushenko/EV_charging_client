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

/** Текст з кирилицею ймовірно вже призначений для користувача (наприклад з HttpError). */
function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

const DEFAULT_SERVER_ERROR_UK =
  'На сервері сталася несподівана помилка. Спробуйте ще раз пізніше або зверніться до адміністратора.';

export type UserFacingApiErrorOptions = {
  /** Для 5xx без кирилиці в повідомленні (технічний текст з бекенду) — замість загального речення. */
  serverError?: string;
};

/**
 * Перетворює ApiError на зрозумілий для адміністратора текст: приховує сирі технічні деталі 5xx.
 */
export function userFacingApiErrorMessage(
  e: unknown,
  fallback: string,
  options?: UserFacingApiErrorOptions
): string {
  if (!(e instanceof ApiError)) return fallback;
  const { status, message } = e;

  if (status >= 500) {
    if (!hasCyrillic(message)) {
      return options?.serverError ?? DEFAULT_SERVER_ERROR_UK;
    }
    if (message.startsWith('Internal server error: ')) {
      return message.slice('Internal server error: '.length);
    }
    return message;
  }

  if (message.startsWith('Request error: ') && hasCyrillic(message)) {
    return message.slice('Request error: '.length);
  }

  return message;
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
      ? o.message.trim()
      : null;
  /** Бекенд шле `{ error: "Request error", message: "…" }` — для UI достатньо лише `message`. */
  const msg = detail ?? errPart;
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

export function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(path, init);
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
