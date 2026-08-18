import { API_BASE, API_ORIGIN } from "./config";
import { getAccessToken, getRefreshToken, getSessionId, saveSession, clearSession } from "../auth/storage";
import { friendlyNetworkError } from "../lib/network-error";

export type Paginated<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

export function unwrapList<T>(body: T[] | Paginated<T> | null | undefined): T[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray(body.results)) {
    return body.results;
  }
  return [];
}

export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = await getRefreshToken();
    if (!refresh) return null;
    try {
      const base = API_BASE || API_ORIGIN;
      const res = await fetch(`${base}/api/v1/auth/token/refresh/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) throw new Error("refresh failed");
      const data = (await res.json()) as { access: string; refresh?: string };
      await saveSession({
        access: data.access,
        refresh: data.refresh || refresh,
      });
      return data.access;
    } catch {
      await clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function isAuthPath(path: string): boolean {
  return (
    path.includes("/auth/google") ||
    path.includes("/auth/phone/") ||
    path.includes("/auth/token/refresh")
  );
}

/** Backend REST — Bearer token + 401 da refresh. */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const method = (init?.method || "GET").toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  // FormData: browser/RN sets multipart boundary — do not force JSON Content-Type.
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    !headers["Content-Type"] &&
    !isFormData
  ) {
    headers["Content-Type"] = "application/json";
  }
  if (isFormData) {
    delete headers["Content-Type"];
  }

  if (!isAuthPath(path) && !headers.Authorization) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const sessionId = await getSessionId();
    if (sessionId) headers["X-Session-Id"] = sessionId;
  }

  try {
    let res = await fetch(url, {
      ...init,
      method,
      signal: init?.signal ?? controller.signal,
      headers,
    });

    if (res.status === 401 && !isAuthPath(path)) {
      const next = await tryRefresh();
      if (next) {
        headers.Authorization = `Bearer ${next}`;
        res = await fetch(url, {
          ...init,
          method,
          signal: init?.signal ?? controller.signal,
          headers,
        });
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail = text.slice(0, 200) || res.statusText;
      try {
        const j = JSON.parse(text) as {
          detail?: string;
          message?: string;
          status?: string;
        };
        if (typeof j.detail === "string") detail = j.detail;
        else if (typeof j.message === "string") detail = j.message;
      } catch {
        /* ignore */
      }
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(
          "Server vaqtincha javob bermayapti (502). Bir necha soniyadan keyin qayta urinib ko'ring.",
        );
      }
      throw new Error(detail.startsWith("API ") ? detail : `API ${res.status}: ${detail}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Backend javob bermadi (timeout). Internetni tekshiring.");
    }
    throw new Error(friendlyNetworkError(err, API_BASE || API_ORIGIN));
  } finally {
    clearTimeout(timer);
  }
}

export async function apiList<T>(path: string): Promise<T[]> {
  const body = await apiJson<T[] | Paginated<T>>(path);
  return unwrapList(body);
}

/**
 * Raw fetch — 202 Accepted (try-on job) uchun.
 * `timeoutMs` default 120s (AI uzoq ishlashi mumkin).
 */
export async function apiFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const url = buildUrl(path);
  const method = (init?.method || "GET").toUpperCase();
  const timeoutMs = init?.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    !headers["Content-Type"] &&
    !isFormData
  ) {
    headers["Content-Type"] = "application/json";
  }
  if (isFormData) delete headers["Content-Type"];

  if (!isAuthPath(path) && !headers.Authorization) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const sessionId = await getSessionId();
    if (sessionId) headers["X-Session-Id"] = sessionId;
  }

  try {
    let res = await fetch(url, {
      ...init,
      method,
      signal: init?.signal ?? controller.signal,
      headers,
    });

    if (res.status === 401 && !isAuthPath(path)) {
      const next = await tryRefresh();
      if (next) {
        headers.Authorization = `Bearer ${next}`;
        res = await fetch(url, {
          ...init,
          method,
          signal: init?.signal ?? controller.signal,
          headers,
        });
      }
    }
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Backend javob bermadi (timeout). Internetni tekshiring.");
    }
    throw new Error(friendlyNetworkError(err, API_BASE || API_ORIGIN));
  } finally {
    clearTimeout(timer);
  }
}

export { API_BASE };
