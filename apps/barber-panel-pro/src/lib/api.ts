type TokenKind = "barber";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "http://127.0.0.1:8000";
const AUTH_KIND: TokenKind = ((import.meta.env.VITE_AUTH_KIND as string | undefined) || "barber")
  .trim()
  .toLowerCase() === "barber"
  ? "barber"
  : "barber";

const TOKEN_KEY_BARBER = "mybarber_barber_access";
const REFRESH_KEY_BARBER = "mybarber_barber_refresh";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getToken(kind: TokenKind = AUTH_KIND): { access: string | null; refresh: string | null } {
  if (!isBrowser()) return { access: null, refresh: null };
  if (kind === "barber") {
    return {
      access: localStorage.getItem(TOKEN_KEY_BARBER),
      refresh: localStorage.getItem(REFRESH_KEY_BARBER),
    };
  }
  return { access: null, refresh: null };
}

export function setTokens(access: string, refresh: string) {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY_BARBER, access);
  localStorage.setItem(REFRESH_KEY_BARBER, refresh);
}

export function clearTokens() {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY_BARBER);
  localStorage.removeItem(REFRESH_KEY_BARBER);
}

function shouldOmitBearerForPath(path: string): boolean {
  const p = path.split("?")[0].replace(/\/+$/, "");
  const noBearer = ["/api/v1/barber/auth/token", "/api/v1/barber/auth/token/refresh"];
  return noBearer.some((suffix) => p === suffix || p.endsWith(suffix));
}

async function refreshAccess(): Promise<string | null> {
  const stored = getToken("barber");
  if (!stored.refresh) return null;
  const res = await fetch(`${API_BASE}/api/v1/barber/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: stored.refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json().catch(() => ({}))) as { access?: string; refresh?: string };
  if (!data.access || !data.refresh) {
    clearTokens();
    return null;
  }
  setTokens(data.access, data.refresh);
  return data.access;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(options.headers);
  const stored = getToken("barber");
  if (stored.access && !shouldOmitBearerForPath(path)) {
    headers.set("Authorization", `Bearer ${stored.access}`);
  }
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && retry && stored.access && !shouldOmitBearerForPath(path)) {
    const newAccess = await refreshAccess();
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
    if (Array.isArray(d.non_field_errors) && typeof d.non_field_errors[0] === "string")
      return d.non_field_errors[0];
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
    throw new Error(`Server javobi JSON emas (${res.status}). ${preview}`);
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

export { API_BASE };
