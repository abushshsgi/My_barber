const ENV_API_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ||
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.NEXT_PUBLIC_API_URL ||
  "";

const FALLBACK_DEV_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";

export const API_BASE = (ENV_API_BASE.trim() ? ENV_API_BASE : FALLBACK_DEV_BASE).replace(/\/+$/, "");

const TOKEN_KEY_BARBER = "mybarber_barber_access";
const REFRESH_KEY_BARBER = "mybarber_barber_refresh";

export function getBarberAccessToken(): string | null {
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
    p === "/api/v1/barber/auth/token/refresh/"
  );
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

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getBarberAccessToken();
  if (token && !shouldOmitBearerForPath(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && retry && token) {
    const newAccess = await refreshBarberAccess();
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }
  return res;
}

export function formatApiError(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const d = body as { detail?: unknown; non_field_errors?: unknown; [k: string]: unknown };
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.detail) && d.detail.length) return String(d.detail[0]);
    if (Array.isArray(d.non_field_errors) && d.non_field_errors.length)
      return String(d.non_field_errors[0]);
  }
  return fallback;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  const text = await res.text();
  const body = text.trim() ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) throw new Error(formatApiError(body, res.statusText));
  return body as T;
}

