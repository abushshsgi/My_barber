const ENV_API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ||
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.NEXT_PUBLIC_API_URL ||
  "";

const FALLBACK_DEV_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";

if (import.meta.env.PROD && !ENV_API_BASE.trim()) {
  throw new Error(
    "Production build requires VITE_API_URL or NEXT_PUBLIC_API_URL (e.g. https://api.mysaloon.uz).",
  );
}

export const API_BASE = (ENV_API_BASE.trim() ? ENV_API_BASE : FALLBACK_DEV_BASE).replace(
  /\/+$/,
  "",
);

const TOKEN_KEY_BARBER = "mybarber_barber_access";
const REFRESH_KEY_BARBER = "mybarber_barber_refresh";

export function getBarberAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const tok = localStorage.getItem(TOKEN_KEY_BARBER);
  return tok || null;
}

function getBarberRefreshToken(): string | null {
  const tok = localStorage.getItem(REFRESH_KEY_BARBER);
  return tok || null;
}

export function setBarberTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY_BARBER, access);
  localStorage.setItem(REFRESH_KEY_BARBER, refresh);
}

export function clearBarberTokens() {
  localStorage.removeItem(TOKEN_KEY_BARBER);
  localStorage.removeItem(REFRESH_KEY_BARBER);
}

function shouldOmitBearerForPath(path: string): boolean {
  const p = path.split("?")[0].replace(/\/+$/, "");
  return (
    p === "/api/v1/barber/auth/token" ||
    p === "/api/v1/barber/auth/token/" ||
    p === "/api/v1/barber/auth/token/refresh" ||
    p === "/api/v1/barber/auth/token/refresh/" ||
    p === "/api/v1/auth/barber-register" ||
    p === "/api/v1/auth/barber-register/" ||
    p === "/api/v1/auth/barber-register-join-salon" ||
    p === "/api/v1/auth/barber-register-join-salon/" ||
    // JWT yuborilsa SimpleJWT / boshqa auth xato qiladi; qidiruv — AllowAny
    p === "/api/v1/barber/auth/verify-email" ||
    p === "/api/v1/barber/auth/verify-email/" ||
    p === "/api/v1/salons/search/"
  );
}

function abortAfter(ms: number): AbortSignal {
  const c = new AbortController();
  window.setTimeout(() => c.abort(new DOMException("Vaqt tugadi", "AbortError")), ms);
  return c.signal;
}

/** Bir nechta signaldan biri abort qilinsa, natijaviy ham abort bo‘ladi. */
function mergeAbortSignals(parts: AbortSignal[]): AbortSignal {
  if (parts.length === 0) {
    return new AbortController().signal;
  }
  const c = new AbortController();
  for (const s of parts) {
    if (s.aborted) {
      c.abort();
      return c.signal;
    }
    s.addEventListener("abort", () => c.abort(), { once: true });
  }
  return c.signal;
}

async function refreshBarberAccess(): Promise<string | null> {
  const refresh = getBarberRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/api/v1/barber/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearBarberTokens();
    return null;
  }
  const body = (await res.json().catch(() => ({}))) as { access?: string; refresh?: string };
  if (!body.access || !body.refresh) {
    clearBarberTokens();
    return null;
  }
  setBarberTokens(body.access, body.refresh);
  return body.access;
}

export const RESEND_VERIFICATION_EMAIL_TIMEOUT_MS = 45_000;

export function isFetchAbortError(e: unknown): boolean {
  if (e instanceof DOMException || e instanceof Error) return e.name === "AbortError";
  return false;
}

export type ApiFetchOptions = RequestInit & {
  /** Client-side: so‘rov shu millisikunddan keyin abort (tugma cheksiz yuklashda qolmasin). */
  timeoutMs?: number;
};

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
  retry = true,
): Promise<Response> {
  const { timeoutMs, signal: callerSignal, ...fetchRest } = options;
  const parts: AbortSignal[] = [];
  if (callerSignal) parts.push(callerSignal);
  if (timeoutMs !== undefined && timeoutMs > 0) {
    parts.push(abortAfter(timeoutMs));
  }
  const mergedSignal =
    parts.length === 0 ? undefined : parts.length === 1 ? parts[0] : mergeAbortSignals(parts);

  const headers = new Headers(fetchRest.headers);
  const token = getBarberAccessToken();
  if (token && !shouldOmitBearerForPath(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && fetchRest.body && !(fetchRest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${path}`;
  const exec = () =>
    fetch(url, mergedSignal === undefined ? { ...fetchRest, headers } : { ...fetchRest, headers, signal: mergedSignal });

  let res = await exec();
  if (res.status === 401 && retry && token) {
    const newAccess = await refreshBarberAccess();
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await exec();
    }
  }
  return res;
}

export {
  formatApiErrorBody as formatApiError,
  formatHttpApiError,
  formatFetchError,
  parseResponseBody,
} from "@/lib/http-errors";

import { formatHttpApiError, parseResponseBody } from "@/lib/http-errors";

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  const body = await parseResponseBody(res);
  if (!res.ok) throw new Error(formatHttpApiError(res, body, res.statusText));
  return body as T;
}

type PaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

export function unwrapList<T>(body: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(body)) return body;
  return Array.isArray(body.results) ? body.results : [];
}

export async function apiList<T>(path: string, options: RequestInit = {}): Promise<T[]> {
  const body = await apiJson<T[] | PaginatedResponse<T>>(path, options);
  return unwrapList(body);
}
