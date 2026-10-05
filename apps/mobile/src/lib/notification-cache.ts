import { fetchNotifications, type ApiNotification } from "../api/user";

let cached: ApiNotification[] | null = null;
let inflight: Promise<ApiNotification[]> | null = null;

export function peekNotifications(): ApiNotification[] | null {
  return cached;
}

/** Faqat bildirishnomalar. Profil va bronni kutmaydi. */
export function loadNotifications(): Promise<ApiNotification[]> {
  if (inflight) return inflight;
  inflight = fetchNotifications()
    .then((rows) => {
      cached = rows;
      return rows;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
