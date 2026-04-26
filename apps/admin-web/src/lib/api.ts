const ENV_API_BASE =
  // Next.js (client) injects NEXT_PUBLIC_* at build time.
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined) ||
  // Vite injects import.meta.env.* (kept for local/dev flexibility).
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ||
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.NEXT_PUBLIC_API_URL ||
  "";

// If NEXT_PUBLIC_API_URL isn't set in prod, rely on Next rewrites (same-origin).
const API_BASE = ENV_API_BASE.trim() ? ENV_API_BASE.replace(/\/+$/, "") : "";

const TOKEN_KEY_ADMIN = "mybarber_admin_access";
const REFRESH_KEY_ADMIN = "mybarber_admin_refresh";

export function getAdminAccessToken(): string | null {
  const tok = localStorage.getItem(TOKEN_KEY_ADMIN);
  return tok || null;
}

function getAdminRefreshToken(): string | null {
  const tok = localStorage.getItem(REFRESH_KEY_ADMIN);
  return tok || null;
}

export function setAdminTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY_ADMIN, access);
  localStorage.setItem(REFRESH_KEY_ADMIN, refresh);
}

export function clearAdminTokens() {
  localStorage.removeItem(TOKEN_KEY_ADMIN);
  localStorage.removeItem(REFRESH_KEY_ADMIN);
}

function shouldOmitBearerForPath(path: string): boolean {
  const p = path.split("?")[0].replace(/\/+$/, "");
  return (
    p === "/api/v1/admin/auth/token" ||
    p === "/api/v1/admin/auth/token/" ||
    p === "/api/v1/admin/auth/token/refresh" ||
    p === "/api/v1/admin/auth/token/refresh/"
  );
}

async function refreshAdminAccess(): Promise<string | null> {
  const refresh = getAdminRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/api/v1/admin/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearAdminTokens();
    return null;
  }
  const body = (await res.json().catch(() => ({}))) as { access?: string };
  if (!body.access) {
    clearAdminTokens();
    return null;
  }
  localStorage.setItem(TOKEN_KEY_ADMIN, body.access);
  return body.access;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getAdminAccessToken();
  if (token && !shouldOmitBearerForPath(path)) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && retry && token) {
    const newAccess = await refreshAdminAccess();
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }
  return res;
}

function formatApiError(body: unknown, fallback: string): string {
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

export function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  if (t.length < 5 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export { API_BASE };
