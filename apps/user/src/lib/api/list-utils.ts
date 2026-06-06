/** DRF PageNumberPagination javobini massivga aylantirish. */
import { apiJson } from "./client";

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

export async function apiList<T>(path: string, options: RequestInit = {}): Promise<T[]> {
  const body = await apiJson<T[] | Paginated<T>>(path, options);
  return unwrapList(body);
}

/** GPS koordinat — DecimalField (max 9 raqam) uchun. */
export function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
