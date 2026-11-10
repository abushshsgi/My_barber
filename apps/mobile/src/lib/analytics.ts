import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../api/client";

const VISITOR_KEY = "mysaloon_visitor_id";
const SESSION_KEY = "mysaloon_mobile_session_id";

function randomId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

async function storageId(key: string): Promise<string> {
  const existing = await AsyncStorage.getItem(key);
  if (existing && existing.length >= 8) return existing;
  const next = randomId();
  await AsyncStorage.setItem(key, next);
  return next;
}

export function trackMobileEvent(name: "barcode_scan_started" | "barcode_scan_completed"): void {
  void (async () => {
    try {
      const visitorId = await storageId(VISITOR_KEY);
      const sessionId = await storageId(SESSION_KEY);
      await apiFetch("/api/v1/analytics/events/", {
        method: "POST",
        body: JSON.stringify({
          visitor_id: visitorId,
          session_id: sessionId,
          events: [
            {
              event_id: randomId(),
              name,
              version: 1,
              page: "mobile/ingredient",
              properties: { surface: "mobile" },
            },
          ],
        }),
      });
    } catch {
      /* scanning still works if analytics is down */
    }
  })();
}
