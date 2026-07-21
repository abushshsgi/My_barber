function readEnv(name: string): string | undefined {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name] || (typeof process !== "undefined" ? process.env?.[name] : undefined);
}

const ENV_API_BASE = readEnv("VITE_API_URL") || readEnv("NEXT_PUBLIC_API_URL") || "";
const FORCE_DIRECT_API =
  readEnv("VITE_API_DIRECT") === "1" || readEnv("VITE_API_DIRECT") === "true";

/**
 * Production SPA: always same-origin `/api/v1` via Vercel rewrite.
 * Ignoring a leftover VITE_API_URL=https://api.mysaloon.uz on Vercel avoids
 * cross-origin fetches where Railway/gateway 502s surface as CORS errors.
 * Opt-in direct API (debug only): VITE_API_DIRECT=1 + VITE_API_URL=...
 * Local: empty base uses Vite proxy to Django; VITE_API_URL still works in dev.
 */
function resolveWebApiBase(envBase: string): string {
  const trimmed = envBase.trim().replace(/\/+$/, "");
  if (import.meta.env.PROD) {
    if (FORCE_DIRECT_API && trimmed) return trimmed;
    return "";
  }
  return trimmed;
}

const API_BASE = resolveWebApiBase(ENV_API_BASE);

const TOKEN_KEY_ADMIN = "mybarber_admin_access";
const REFRESH_KEY_ADMIN = "mybarber_admin_refresh";

export function getAdminAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const tok = localStorage.getItem(TOKEN_KEY_ADMIN);
  return tok || null;
}

function getAdminRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const tok = localStorage.getItem(REFRESH_KEY_ADMIN);
  return tok || null;
}

export function setAdminTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY_ADMIN, access);
  localStorage.setItem(REFRESH_KEY_ADMIN, refresh);
}

export function clearAdminTokens() {
  if (typeof window === "undefined") return;
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
  const body = (await res.json().catch(() => ({}))) as { access?: string; refresh?: string };
  if (!body.access) {
    clearAdminTokens();
    return null;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY_ADMIN, body.access);
    if (body.refresh) localStorage.setItem(REFRESH_KEY_ADMIN, body.refresh);
  }
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

  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    // Transient network / CORS / abort — one quick retry
    if (retry) {
      await new Promise((r) => window.setTimeout(r, 350));
      res = await fetch(url, { ...options, headers });
    } else {
      throw err;
    }
  }
  if (res.status === 401 && retry && token) {
    const newAccess = await refreshAdminAccess();
    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(url, { ...options, headers });
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
    const fieldKeys = Object.keys(d).filter((k) => k !== "detail" && k !== "non_field_errors");
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
    return JSON.parse(trimmed) as unknown;
  } catch {
    const preview = trimmed.slice(0, 120);
    throw new Error(
      `Server javobi JSON emas (${res.status}). API manzili va backend ishlayotganini tekshiring. ${preview}`,
    );
  }
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  const body = await parseJsonSafe(res);
  if (!res.ok) throw new Error(formatApiError(body, res.statusText));
  return body as T;
}

export function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  if (t.length < 5 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export { API_BASE };
