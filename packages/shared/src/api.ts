const API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "mybarber_access";
const REFRESH_KEY = "mybarber_refresh";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
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

async function refreshAccess(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  const kind = jwtPayloadType(refresh);
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
    clearTokens();
    return null;
  }
  const text = await res.text();
  let data: { access?: string };
  try {
    data = JSON.parse(text) as { access?: string };
  } catch {
    clearTokens();
    return null;
  }
  if (!data.access) {
    clearTokens();
    return null;
  }
  localStorage.setItem(TOKEN_KEY, data.access);
  return data.access;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) {
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
