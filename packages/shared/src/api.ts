function readEnv(name: string): string | undefined {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return (
    viteEnv?.[name] ||
    (typeof process !== "undefined" ? process.env?.[name] : undefined)
  );
}

const ENV_API_BASE = readEnv("VITE_API_URL") || readEnv("NEXT_PUBLIC_API_URL") || "";
const FALLBACK_DEV_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";
const API_BASE = (ENV_API_BASE.trim() ? ENV_API_BASE : FALLBACK_DEV_BASE).replace(/\/+$/, "");

const TOKEN_KEY = "mybarber_access";
const REFRESH_KEY = "mybarber_refresh";

const TOKEN_KEY_USER = "mybarber_user_access";
const REFRESH_KEY_USER = "mybarber_user_refresh";
const TOKEN_KEY_BARBER = "mybarber_barber_access";
const REFRESH_KEY_BARBER = "mybarber_barber_refresh";
const TOKEN_KEY_ADMIN = "mybarber_admin_access";
const REFRESH_KEY_ADMIN = "mybarber_admin_refresh";

type TokenKind = "admin" | "barber" | "user";

function envDefaultKind(): TokenKind | null {
  const raw = readEnv("VITE_AUTH_KIND") || readEnv("NEXT_PUBLIC_AUTH_KIND") || "";
  const v = raw.trim().toLowerCase();
  if (v === "admin" || v === "barber" || v === "user") return v;
  return null;
}

export function getAccessToken(): string | null {
  return getUserAccessToken();
}

function keyFor(kind: TokenKind): { access: string; refresh: string } {
  if (kind === "admin") return { access: TOKEN_KEY_ADMIN, refresh: REFRESH_KEY_ADMIN };
  if (kind === "barber") return { access: TOKEN_KEY_BARBER, refresh: REFRESH_KEY_BARBER };
  return { access: TOKEN_KEY_USER, refresh: REFRESH_KEY_USER };
}

export function getToken(kind: TokenKind): { access: string | null; refresh: string | null } {
  return getStored(kind);
}

export function getUserAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const userToken = localStorage.getItem(TOKEN_KEY_USER);
  if (userToken) return userToken;
  const legacy = localStorage.getItem(TOKEN_KEY);
  // Legacy key might contain a barber/admin token from older builds or shared domains.
  // Only accept it for user flows.
  return jwtPayloadType(legacy) === "user" ? legacy : null;
}

export function getBarberAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const tok = localStorage.getItem(TOKEN_KEY_BARBER);
  return tok || null;
}

export function getAdminAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const tok = localStorage.getItem(TOKEN_KEY_ADMIN);
  return tok || null;
}

function getStored(kind: TokenKind): { access: string | null; refresh: string | null } {
  if (typeof window === "undefined") return { access: null, refresh: null };
  const keys = keyFor(kind);
  const legacyAccess = localStorage.getItem(TOKEN_KEY);
  const legacyRefresh = localStorage.getItem(REFRESH_KEY);
  const legacyAccessUser = jwtPayloadType(legacyAccess) === "user" ? legacyAccess : null;
  const legacyRefreshUser = jwtPayloadType(legacyRefresh) === "user" ? legacyRefresh : null;
  const access = localStorage.getItem(keys.access) || (kind === "user" ? legacyAccessUser : null);
  const refresh = localStorage.getItem(keys.refresh) || (kind === "user" ? legacyRefreshUser : null);
  return { access: access || null, refresh: refresh || null };
}

export function setTokens(access: string, refresh: string) {
  const kind = jwtPayloadType(access) || jwtPayloadType(refresh) || "user";
  const keys = keyFor(kind);
  localStorage.setItem(keys.access, access);
  localStorage.setItem(keys.refresh, refresh);

  // Back-compat: keep legacy keys for user flow only.
  if (kind === "user") {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(TOKEN_KEY_USER);
  localStorage.removeItem(REFRESH_KEY_USER);
  localStorage.removeItem(TOKEN_KEY_BARBER);
  localStorage.removeItem(REFRESH_KEY_BARBER);
  localStorage.removeItem(TOKEN_KEY_ADMIN);
  localStorage.removeItem(REFRESH_KEY_ADMIN);
}

/** Faqat admin JWT — mijoz/sartarosh sessiyasini saqlab qolish uchun. */
export function clearAdminTokens() {
  localStorage.removeItem(TOKEN_KEY_ADMIN);
  localStorage.removeItem(REFRESH_KEY_ADMIN);
}

/** Oddiy email tekshiruvi (UI validatsiyasi). */
export function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  if (t.length < 5 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function jwtPayloadType(token: string | null): "admin" | "barber" | "user" | null {
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

/** Token olish / refresh — Authorization yubormaslik kerak (eski Bearer SimpleJWT xatosini beradi). */
function shouldOmitBearerForPath(path: string): boolean {
  const p = path.split("?")[0].replace(/\/+$/, "");
  const noBearer = [
    "/api/v1/admin/auth/token",
    "/api/v1/admin/auth/token/refresh",
    "/api/v1/barber/auth/token",
    "/api/v1/barber/auth/token/refresh",
    "/api/v1/auth/token",
    "/api/v1/auth/token/refresh",
    // Public signup — eski/noto‘g‘ri JWT yuborilsa SimpleJWT 403 + "Given token not valid for any token type"
    "/api/v1/auth/register",
    "/api/v1/auth/barber-register",
  ];
  return noBearer.some((suffix) => p === suffix || p.endsWith(suffix));
}

function desiredKindForPath(path: string): TokenKind {
  const p = path.split("?")[0];
  if (p.includes("/api/v1/admin/")) return "admin";
  if (p.includes("/api/v1/barber/")) return "barber";
  // For shared endpoints (e.g. /api/v1/bookings/, /api/v1/notifications/),
  // choose a token kind only when it's unambiguous in this browser session.
  // This avoids barber-web accidentally sending no token just because the path
  // isn't under /api/v1/barber/.
  const hasAdmin = typeof window !== "undefined" && !!getStored("admin").access;
  const hasBarber = typeof window !== "undefined" && !!getStored("barber").access;
  const hasUser = typeof window !== "undefined" && !!getStored("user").access;
  const count = Number(hasAdmin) + Number(hasBarber) + Number(hasUser);
  if (count === 1) {
    if (hasAdmin) return "admin";
    if (hasBarber) return "barber";
    return "user";
  }
  const hinted = envDefaultKind();
  if (hinted) return hinted;
  return "user";
}

async function refreshAccess(kindHint: TokenKind, pathForRefresh: string): Promise<string | null> {
  const stored = getStored(kindHint);
  const refresh = stored.refresh;
  if (!refresh) return null;
  const kind = jwtPayloadType(refresh) || kindHint;
  const url =
    kind === "admin"
      ? `${API_BASE}/api/v1/admin/auth/token/refresh/`
      : kind === "barber"
        ? `${API_BASE}/api/v1/barber/auth/token/refresh/`
        : `${API_BASE}/api/v1/auth/token/refresh/`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    // Only clear tokens of this kind (to avoid logging out other panels)
    const keys = keyFor(kind);
    localStorage.removeItem(keys.access);
    localStorage.removeItem(keys.refresh);
    if (kind === "user") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
    return null;
  }
  const text = await res.text();
  let data: { access?: string };
  try {
    data = JSON.parse(text) as { access?: string };
  } catch {
    const keys = keyFor(kind);
    localStorage.removeItem(keys.access);
    localStorage.removeItem(keys.refresh);
    if (kind === "user") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
    return null;
  }
  if (!data.access) {
    const keys = keyFor(kind);
    localStorage.removeItem(keys.access);
    localStorage.removeItem(keys.refresh);
    if (kind === "user") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
    return null;
  }
  const keys = keyFor(kind);
  localStorage.setItem(keys.access, data.access);
  if (kind === "user") {
    localStorage.setItem(TOKEN_KEY, data.access);
  }
  return data.access;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const headers = new Headers(options.headers);
  const kind = desiredKindForPath(path);
  const stored = getStored(kind);
  const token = stored.access;
  if (token && !shouldOmitBearerForPath(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && retry && token) {
    const newAccess = await refreshAccess(kind, path);
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }
  return res;
}

export function formatApiError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const d = body as {
      detail?: unknown;
      non_field_errors?: string[];
      [key: string]: unknown;
    };
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.detail) && d.detail.length) return String(d.detail[0]);
    if (Array.isArray(d.non_field_errors) && d.non_field_errors[0])
      return String(d.non_field_errors[0]);
    if (typeof d.detail === "object" && d.detail !== null && !Array.isArray(d.detail)) {
      const parts = Object.entries(d.detail as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join("; ");
      if (parts) return parts;
    }
    const fieldKeys = Object.keys(d).filter(
      (k) => k !== "detail" && k !== "non_field_errors"
    );
    if (fieldKeys.length) {
      const parts = fieldKeys
        .map((k) => {
          const v = d[k];
          if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
          if (v && typeof v === "object") return `${k}: ${JSON.stringify(v)}`;
          return `${k}: ${String(v)}`;
        })
        .join("; ");
      if (parts) return parts;
    }
  }
  return fallback;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const preview = trimmed.slice(0, 120);
    throw new Error(
      `Server javobi JSON emas (${res.status}). API manzili va backend ishlayotganini tekshiring. ${preview}`
    );
  }
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(formatApiError(body, res.statusText));
  }
  return body as T;
}

/** Brauzerda ishlatiladigan API bazaviy URL (Vercel: NEXT_PUBLIC_API_URL). */
export function getPublicApiBase(): string {
  return API_BASE;
}

export { API_BASE };
