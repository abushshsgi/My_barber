import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { notificationWebSocketUrl } from "@mybarber/shared/ws-url";
import { getUserAccessToken } from "@/lib/api/client";
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

/**
 * Shared singleton socket so multiple consumers (and React StrictMode's
 * mount/unmount/mount cycle in dev) reuse a single connection instead of
 * opening/closing sockets mid-handshake — which produced the noisy
 * "WebSocket is closed before the connection is established" console errors.
 */
let socket: WebSocket | null = null;
let activeToken: string | null = null;
let refCount = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
const clients = new Set<QueryClient>();

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

function openSocket(token: string) {
  if (socket && activeToken === token) return;
  if (socket) {
    try {
      socket.close();
    } catch {
      /* noop */
    }
    socket = null;
  }

  activeToken = token;
  try {
    socket = new WebSocket(notificationWebSocketUrl(token));
  } catch {
    socket = null;
    return;
  }

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

  socket.onclose = () => {
    if (socket && socket.readyState === WebSocket.CLOSED) {
      socket = null;
      activeToken = null;
    }
  };
}

function teardownSocket() {
  const current = socket;
  socket = null;
  activeToken = null;
  if (!current) return;
  current.onmessage = null;
  current.onclose = null;
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
    const token = getUserAccessToken();
    if (!token) return;

    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    clients.add(qc);
    refCount += 1;
    openSocket(token);

    return () => {
      clients.delete(qc);
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) {
        // Defer teardown so StrictMode's immediate remount reuses the socket
        // instead of closing it before the handshake completes.
        closeTimer = setTimeout(() => {
          if (refCount === 0) teardownSocket();
          closeTimer = null;
        }, 1000);
      }
    };
  }, [qc]);
}
