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

/** Oddiy GET — auth keyinroq AsyncStorage token bilan ulanadi. */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text.slice(0, 160) || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function apiList<T>(path: string): Promise<T[]> {
  const body = await apiJson<T[] | Paginated<T>>(path);
  return unwrapList(body);
}

export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
