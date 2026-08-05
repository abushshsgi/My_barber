import { API_BASE } from "./config";

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

/** Backend REST. GET da Content-Type yuborilmaydi (CORS preflight). */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const method = (init?.method || "GET").toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (method !== "GET" && method !== "HEAD" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      ...init,
      method,
      signal: init?.signal ?? controller.signal,
      headers,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text.slice(0, 160) || res.statusText}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Backend javob bermadi (timeout). Internetni tekshiring.");
    }
    if (err instanceof TypeError) {
      throw new Error(`Failed to fetch (${API_BASE || "proxy→api.mysaloon.uz"})`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiList<T>(path: string): Promise<T[]> {
  const body = await apiJson<T[] | Paginated<T>>(path);
  return unwrapList(body);
}

export { API_BASE };
