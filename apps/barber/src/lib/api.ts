import {
  handleBarberAuthFailure,
  isBarberAuthFailureStatus,
  isBarberTokenExpired,
  refreshBarberAccessToken,
} from "@/lib/barber-auth-session";
import { resolveDemoApiOrigin } from "@mybarber/shared/demo-env";

const ENV_API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ||
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.NEXT_PUBLIC_API_URL ||
  "";

const IS_MOBILE_SPA =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_MOBILE_SPA === "true";

function resolveWebApiBase(envBase: string): string {
  const trimmed = envBase.trim().replace(/\/+$/, "");
  if (IS_MOBILE_SPA) return trimmed;
  if (typeof window !== "undefined") {
    const demo = resolveDemoApiOrigin(window.location.hostname);
    if (demo) return demo.replace(/\/+$/, "");
  }
  return trimmed;
}

/** Web (Vercel): bo'sh = joriy origin (/api/v1 proxy). */
export const API_BASE = resolveWebApiBase(ENV_API_BASE);

const TOKEN_KEY_BARBER = "mybarber_barber_access";
const REFRESH_KEY_BARBER = "mybarber_barber_refresh";
const REMEMBER_KEY = "mybarber_barber_remember";

function getRememberPreference(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(REMEMBER_KEY);
  if (v === "0") return false;
  return true;
}

function readToken(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

export function getBarberAccessToken(): string | null {
  return readToken(TOKEN_KEY_BARBER);
}

function getBarberRefreshToken(): string | null {
  return readToken(REFRESH_KEY_BARBER);
}

export function setBarberTokens(access: string, refresh: string, remember = true) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem(TOKEN_KEY_BARBER, access);
  store.setItem(REFRESH_KEY_BARBER, refresh);
  other.removeItem(TOKEN_KEY_BARBER);
  other.removeItem(REFRESH_KEY_BARBER);
}

export function clearBarberTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY_BARBER);
  localStorage.removeItem(REFRESH_KEY_BARBER);
  sessionStorage.removeItem(TOKEN_KEY_BARBER);
  sessionStorage.removeItem(REFRESH_KEY_BARBER);
  localStorage.removeItem(REMEMBER_KEY);
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

let refreshInFlight: Promise<string | null> | null = null;

async function ensureFreshAccessToken(): Promise<string | null> {
  const token = getBarberAccessToken();
  if (!token) return null;
  if (!isBarberTokenExpired(token)) return token;

  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshBarberAccessToken()
    .then((result) => {
      if (result.access) return result.access;
      if (result.revoked) handleBarberAuthFailure("expired");
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export const RESEND_VERIFICATION_EMAIL_TIMEOUT_MS = 45_000;
export const BARBER_SIGNUP_TIMEOUT_MS = 90_000;
export const BARBER_AVAILABILITY_TIMEOUT_MS = 20_000;

export function isFetchAbortError(e: unknown): boolean {
  if (e instanceof DOMException || e instanceof Error) return e.name === "AbortError";
  return false;
}

export type ApiFetchOptions = RequestInit & {
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
  let token = getBarberAccessToken();

  if (token && !shouldOmitBearerForPath(path)) {
    if (isBarberTokenExpired(token)) {
      const fresh = await ensureFreshAccessToken();
      token = fresh;
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!headers.has("Content-Type") && fetchRest.body && !(fetchRest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${path}`;
  const exec = () =>
    fetch(
      url,
      mergedSignal === undefined ? { ...fetchRest, headers } : { ...fetchRest, headers, signal: mergedSignal },
    );

  let res = await exec();

  if (isBarberAuthFailureStatus(res.status) && retry && token) {
    const refreshed = await refreshBarberAccessToken();
    if (refreshed.access) {
      headers.set("Authorization", `Bearer ${refreshed.access}`);
      res = await exec();
    } else if (refreshed.revoked) {
      handleBarberAuthFailure("expired");
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
  if (!res.ok) {
    const message = formatHttpApiError(res, body, res.statusText);
    if (
      isBarberAuthFailureStatus(res.status) &&
      getBarberAccessToken() &&
      !shouldOmitBearerForPath(path)
    ) {
      handleBarberAuthFailure("expired");
    }
    throw new Error(message);
  }
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
