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

const TOKEN_KEY_USER = "mybarber_user_access";
const REFRESH_KEY_USER = "mybarber_user_refresh";

export function getUserAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY_USER);
}

function getUserRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY_USER);
}

export function setUserTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY_USER, access);
  localStorage.setItem(REFRESH_KEY_USER, refresh);
}

export function clearUserTokens() {
  localStorage.removeItem(TOKEN_KEY_USER);
  localStorage.removeItem(REFRESH_KEY_USER);
}

function shouldOmitBearerForPath(path: string): boolean {
  const p = path.split("?")[0].replace(/\/+$/, "");
  return (
    p === "/api/v1/auth/phone/send-code" ||
    p === "/api/v1/auth/phone/send-code/" ||
    p === "/api/v1/auth/phone/verify" ||
    p === "/api/v1/auth/phone/verify/" ||
    p === "/api/v1/auth/token/refresh" ||
    p === "/api/v1/auth/token/refresh/"
  );
}

async function refreshAccess(): Promise<string | null> {
  const refresh = getUserRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/api/v1/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearUserTokens();
    return null;
  }
  const data = (await res.json()) as { access?: string; refresh?: string };
  if (!data.access) {
    clearUserTokens();
    return null;
  }
  setUserTokens(data.access, data.refresh ?? refresh);
  return data.access;
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
  if (token && !shouldOmitBearerForPath(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && retry && token) {
    const newAccess = await refreshAccess();
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }
  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(formatApiError(body, res.statusText || "Xatolik"));
  }
  return body as T;
}
