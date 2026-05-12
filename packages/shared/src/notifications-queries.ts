import { apiFetch, getAccessToken } from "./api";

export type NotifRow = {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchNotifications(): Promise<NotifRow[]> {
  if (!getAccessToken()) return [];
  const res = await apiFetch("/api/v1/notifications/");
  if (res.status === 401 || res.status === 403) return [];
  if (!res.ok) throw new Error("Xabarlar yuklanmadi");
  const j = (await res.json()) as { results?: NotifRow[] } | NotifRow[];
  const list = Array.isArray(j) ? j : j.results || [];
  return list.map((n) => ({
    ...n,
    payload:
      n.payload && typeof n.payload === "object" ? (n.payload as Record<string, unknown>) : null,
  }));
}
