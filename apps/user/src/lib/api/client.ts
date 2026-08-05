import { resolveDemoApiOrigin } from "@mybarber/shared/demo-env";
import { migrateFaceProfileOnLogout } from "@/lib/face-profile";
import { resolveFetchBase } from "@/lib/api/base-url";
import { isPublicCustomerApiPath } from "@/lib/public-api-paths";
import { pathRequiresAuth } from "@/lib/auth-routes";
import { clearQueryClientCache } from "@/lib/query-client";
import { migrateUserPrefsOnLogout } from "@/lib/user-prefs";

const ENV_API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ||
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.NEXT_PUBLIC_API_URL ||
  "";

/** Web (Vercel): bo'sh = joriy origin (/api/v1 proxy). */
function resolveWebApiBase(envBase: string): string {
  const trimmed = envBase.trim().replace(/\/+$/, "");
  // Web production: same-origin proxy — to‘g‘ridan-to‘g‘ri api.mysaloon.uz Cloudflare cookie xatolarini keltiradi.
  if (import.meta.env.PROD) return "";
  return trimmed;
}

export const API_BASE = resolveWebApiBase(ENV_API_BASE);

function fetchBase(): string {
  return resolveFetchBase(API_BASE);
}

/** WebSocket REST bilan bir xil domen talab qilmaydi — to‘g‘ridan-to‘g‘ri API host. */
export function getWsApiBase(): string {
  if (API_BASE) return API_BASE;
  if (typeof window !== "undefined") {
    const demo = resolveDemoApiOrigin(window.location.hostname);
    if (demo) return demo.replace(/\/+$/, "");
  }
  if (import.meta.env.DEV) return "http://127.0.0.1:8000";
  const override =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_WS_API_URL ||
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.NEXT_PUBLIC_WS_API_URL;
  return override?.trim() || "https://api.mysaloon.uz";
}

const TOKEN_KEY_USER = "mybarber_user_access";
const REFRESH_KEY_USER = "mybarber_user_refresh";
const SESSION_KEY_USER = "mybarber_user_session_id";
const TOKEN_KEY_LEGACY = "mybarber_access";
const REFRESH_KEY_LEGACY = "mybarber_refresh";

const USER_KEY = "mysaloon.auth.user";

type JwtKind = "admin" | "barber" | "user";

function jwtPayloadType(token: string | null): JwtKind | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { type?: string };
    if (payload.type === "admin_access" || payload.type === "admin_refresh") return "admin";
    if (payload.type === "barber_access" || payload.type === "barber_refresh") return "barber";
    return "user";
  } catch {
    return null;
  }
}

function readStoredUserAccess(): string | null {
  const userToken = localStorage.getItem(TOKEN_KEY_USER);
  if (userToken) {
    const kind = jwtPayloadType(userToken);
    if (kind === "user") return userToken;
    localStorage.removeItem(TOKEN_KEY_USER);
    localStorage.removeItem(TOKEN_KEY_LEGACY);
    return null;
  }
  const legacy = localStorage.getItem(TOKEN_KEY_LEGACY);
  if (!legacy) return null;
  if (jwtPayloadType(legacy) === "user") return legacy;
  return null;
}

function readStoredUserRefresh(): string | null {
  const refresh = localStorage.getItem(REFRESH_KEY_USER);
  if (refresh) {
    const kind = jwtPayloadType(refresh);
    if (kind === "user") return refresh;
    localStorage.removeItem(REFRESH_KEY_USER);
    localStorage.removeItem(REFRESH_KEY_LEGACY);
    return null;
  }
  const legacy = localStorage.getItem(REFRESH_KEY_LEGACY);
  if (!legacy) return null;
  if (jwtPayloadType(legacy) === "user") return legacy;
  return null;
}

export function getUserAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return readStoredUserAccess();
}

export function getUserRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return readStoredUserRefresh();
}

let sessionBootstrapped = false;
let bootstrapInFlight: Promise<boolean> | null = null;

export function resetSessionBootstrap() {
  sessionBootstrapped = false;
  bootstrapInFlight = null;
}

export function getUserSessionId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY_USER);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function setUserSessionId(sessionId: number | null) {
  if (typeof window === "undefined") return;
  if (sessionId == null) {
    localStorage.removeItem(SESSION_KEY_USER);
    return;
  }
  localStorage.setItem(SESSION_KEY_USER, String(sessionId));
}

export function setUserTokens(access: string, refresh: string, sessionId?: number | null) {
  const accessKind = jwtPayloadType(access);
  const refreshKind = jwtPayloadType(refresh);
  if ((accessKind && accessKind !== "user") || (refreshKind && refreshKind !== "user")) {
    throw new Error("Foydalanuvchi sessiyasi uchun noto'g'ri token turi.");
  }
  localStorage.setItem(TOKEN_KEY_USER, access);
  localStorage.setItem(REFRESH_KEY_USER, refresh);
  localStorage.setItem(TOKEN_KEY_LEGACY, access);
  localStorage.setItem(REFRESH_KEY_LEGACY, refresh);
  if (sessionId !== undefined) {
    setUserSessionId(sessionId);
  }
  resetSessionBootstrap();
}

export function clearUserTokens() {
  localStorage.removeItem(TOKEN_KEY_USER);
  localStorage.removeItem(REFRESH_KEY_USER);
  localStorage.removeItem(TOKEN_KEY_LEGACY);
  localStorage.removeItem(REFRESH_KEY_LEGACY);
  localStorage.removeItem(SESSION_KEY_USER);
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
  resetSessionBootstrap();
}

function shouldOmitBearerForPath(path: string): boolean {
  const p = path.split("?")[0].replace(/\/+$/, "");
  return (
    p === "/api/v1/auth/google/" ||
    p === "/api/v1/auth/phone/send-code" ||
    p === "/api/v1/auth/phone/verify" ||
    p === "/api/v1/auth/phone/check" ||
    p === "/api/v1/auth/phone/password-login" ||
    p === "/api/v1/auth/token/refresh"
  );
}

function isAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

function isInvalidTokenMessage(message: string): boolean {
  return /token not valid|not authenticated|authentication credentials were not provided/i.test(
    message,
  );
}

function redirectToAuthIfNeeded() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === "/auth" || path.startsWith("/auth/")) return;
  // Ochiq sahifalarda sessiyani tozalash kifoya — login'ga majburan itarmaymiz.
  if (!pathRequiresAuth(path)) return;
  const search = window.location.search || "";
  const redirect = encodeURIComponent(`${path}${search}`);
  window.location.assign(`/auth?redirect=${redirect}`);
}

function readActiveUserIdBeforeClear(): number | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

export function handleAuthFailure() {
  const uid = readActiveUserIdBeforeClear();
  if (uid) {
    migrateFaceProfileOnLogout(uid);
    migrateUserPrefsOnLogout(uid);
  }
  clearUserTokens();
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
  clearQueryClientCache();
  redirectToAuthIfNeeded();
}

async function parseJsonBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type RefreshResult = { access: string | null; revoked: boolean };

let refreshInFlight: Promise<RefreshResult> | null = null;

async function refreshAccess(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = getUserRefreshToken();
    if (!refresh || isTokenExpired(refresh)) {
      return { access: null, revoked: true };
    }
    const base = fetchBase();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await fetch(`${base}/api/v1/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) {
          // 401/403 = yaroqsiz sessiya
          const revoked = isAuthFailureStatus(res.status) || res.status === 404;
          return { access: null, revoked };
        }
        const data = (await parseJsonBody(res)) as { access?: string; refresh?: string } | null;
        if (!data?.access || jwtPayloadType(data.access) !== "user") {
          return { access: null, revoked: true };
        }
        setUserTokens(data.access, data.refresh ?? refresh);
        return { access: data.access, revoked: false };
      } catch {
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
          continue;
        }
        return { access: null, revoked: false };
      }
    }
    return { access: null, revoked: false };
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function formatApiError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    const first = Object.values(obj).find((v) => typeof v === "string" || Array.isArray(v));
    if (typeof first === "string") return first;
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  return fallback;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getUserAccessToken();
  const publicPath = isPublicCustomerApiPath(path);

  if (token && !publicPath && !shouldOmitBearerForPath(path)) {
    headers.set("Authorization", `Bearer ${token}`);
    const sessionId = getUserSessionId();
    if (sessionId != null) {
      headers.set("X-Session-Id", String(sessionId));
    }
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const base = fetchBase();
  let res = await fetch(`${base}${path}`, { ...options, headers });

  if (isAuthFailureStatus(res.status) && retry && token) {
    const refreshed = await refreshAccess();
    if (refreshed.access) {
      headers.set("Authorization", `Bearer ${refreshed.access}`);
      res = await fetch(`${base}${path}`, { ...options, headers });
    } else if (refreshed.revoked) {
      handleAuthFailure();
    }
  }

  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  const body = await parseJsonBody(res);

  if (!res.ok) {
    const message = formatApiError(body, res.statusText || "Xatolik");
    if (isAuthFailureStatus(res.status) && isInvalidTokenMessage(message)) {
      handleAuthFailure();
    }
    throw new Error(message);
  }

  // DELETE va boshqa 204/empty body — muvaffaqiyatli, JSON talab qilinmaydi.
  if (res.status === 204 || body == null) {
    return undefined as T;
  }

  if (typeof body !== "object") {
    throw new Error("Server noto'g'ri javob qaytardi. Sahifani yangilab qayta urinib ko'ring.");
  }

  return body as T;
}

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const exp = decodeJwtExp(token);
  if (exp == null) return false;
  return exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function hasValidUserSession(): boolean {
  if (typeof window === "undefined") return false;

  const access = readStoredUserAccess();
  if (access && !isTokenExpired(access)) return true;

  const refresh = readStoredUserRefresh();
  if (refresh && !isTokenExpired(refresh)) return true;

  return false;
}

/** Ilova ochilganda access tugasa refresh orqali sessiyani tiklash (7 kun eslab qolish). */
export async function bootstrapUserSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (sessionBootstrapped) return hasValidUserSession();
  if (bootstrapInFlight) return bootstrapInFlight;

  bootstrapInFlight = (async () => {
    const access = readStoredUserAccess();
    const refresh = readStoredUserRefresh();

    if (!access && !refresh) {
      sessionBootstrapped = true;
      return false;
    }

    if (access && !isTokenExpired(access)) {
      sessionBootstrapped = true;
      return true;
    }

    if (refresh && !isTokenExpired(refresh)) {
      const refreshed = await refreshAccess();
      sessionBootstrapped = true;
      if (refreshed.access) return true;
      if (refreshed.revoked) {
        clearUserTokens();
        return false;
      }
      // Tarmoq xatosi — refresh token hali amalda, ilova ochilsin.
      return true;
    }

    clearUserTokens();
    sessionBootstrapped = true;
    return false;
  })();

  try {
    return await bootstrapInFlight;
  } finally {
    bootstrapInFlight = null;
  }
}
