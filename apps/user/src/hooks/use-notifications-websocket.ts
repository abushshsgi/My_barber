import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { notificationWebSocketUrl } from "@mybarber/shared/ws-url";
import {
  bootstrapUserSession,
  getUserAccessToken,
  hasValidUserSession,
} from "@/lib/api/client";
import { notificationsQueryKeyBase } from "@/hooks/use-notifications-api";
import { bookingsQueryKeyBase } from "@/hooks/use-bookings-api";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";

type WsPayload = {
  type?: string;
  event?: string;
  id?: number;
  title?: string;
  booking_id?: number;
  payload?: { booking_id?: number };
};

export type UserWsConnectionState = "connecting" | "open" | "closed";

let socket: WebSocket | null = null;
let activeToken: string | null = null;
let refCount = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsState: UserWsConnectionState = "closed";
const clients = new Set<QueryClient>();
const wsListeners = new Set<(open: boolean) => void>();

function setWsState(next: UserWsConnectionState) {
  wsState = next;
  const open = next === "open";
  for (const fn of wsListeners) fn(open);
}

export function getUserWsState(): UserWsConnectionState {
  return wsState;
}

export function subscribeUserWsState(listener: (open: boolean) => void) {
  wsListeners.add(listener);
  listener(wsState === "open");
  return () => {
    wsListeners.delete(listener);
  };
}

function invalidateAll() {
  for (const qc of clients) {
    void qc.invalidateQueries({ queryKey: notificationsQueryKeyBase });
  }
}

function refreshBookings(bookingId?: number) {
  const userId = getAuthUserId();
  for (const qc of clients) {
    void qc.refetchQueries({ queryKey: bookingsQueryKeyBase, type: "active" });
    if (bookingId != null && userId) {
      void qc.refetchQueries({
        queryKey: userQueryKey([...bookingsQueryKeyBase, String(bookingId)] as const, userId),
        type: "active",
      });
    }
  }
}

function scheduleReconnect() {
  if (refCount === 0 || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectIfAuthenticated();
  }, 5_000);
}

async function connectIfAuthenticated() {
  if (refCount === 0) return;
  if (!hasValidUserSession()) {
    const ok = await bootstrapUserSession();
    if (!ok) return;
  }
  const token = getUserAccessToken();
  if (token) openSocket(token);
}

function openSocket(token: string) {
  if (socket && activeToken === token && (wsState === "open" || wsState === "connecting")) {
    return;
  }

  if (socket) {
    const stale = socket;
    socket = null;
    stale.onclose = null;
    stale.onerror = null;
    stale.onmessage = null;
    try {
      stale.close();
    } catch {
      /* noop */
    }
  }

  activeToken = token;
  setWsState("connecting");
  try {
    socket = new WebSocket(notificationWebSocketUrl(token));
  } catch {
    socket = null;
    setWsState("closed");
    return;
  }

  socket.onopen = () => setWsState("open");

  socket.onmessage = (evt) => {
    try {
      const payload = JSON.parse(evt.data) as WsPayload;
      if (payload.event === "booking_updated") {
        refreshBookings(payload.booking_id);
        return;
      }
      if (
        payload.event === "notification" ||
        payload.type === "notification" ||
        payload.type === "notifications" ||
        (typeof payload.id === "number" && typeof payload.title === "string")
      ) {
        invalidateAll();
        const bid = payload.booking_id ?? payload.payload?.booking_id;
        if (bid != null) refreshBookings(bid);
      }
    } catch {
      invalidateAll();
    }
  };

  socket.onerror = () => setWsState("closed");

  socket.onclose = () => {
    setWsState("closed");
    socket = null;
    activeToken = null;
    scheduleReconnect();
  };
}

function teardownSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const current = socket;
  socket = null;
  activeToken = null;
  setWsState("closed");
  if (!current) return;
  current.onmessage = null;
  current.onclose = null;
  current.onerror = null;
  try {
    current.close();
  } catch {
    /* noop */
  }
}

/** Real-time notification refresh when Django Channels + REDIS_URL are enabled. */
export function useNotificationsWebSocket() {
  const qc = useQueryClient();

  useEffect(() => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    clients.add(qc);
    refCount += 1;
    void connectIfAuthenticated();

    const onFocus = () => {
      void connectIfAuthenticated();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clients.delete(qc);
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) {
        closeTimer = setTimeout(() => {
          if (refCount === 0) teardownSocket();
          closeTimer = null;
        }, 1000);
      }
    };
  }, [qc]);
}
