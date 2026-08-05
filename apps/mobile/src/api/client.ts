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
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Backend REST — Accept + cache-bust yo‘q, keyin auth token ulanadi. */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
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
