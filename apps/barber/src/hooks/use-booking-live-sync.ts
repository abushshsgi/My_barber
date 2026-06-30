import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationWebSocketUrl } from "@mybarber/shared/ws-url";
import { getBarberAccessToken } from "@/lib/api";
import { barberQueryKeys } from "@/hooks/use-barber-queries";

export type WsConnectionState = "connecting" | "open" | "closed";

let socket: WebSocket | null = null;
let activeToken: string | null = null;
let refCount = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let wsState: WsConnectionState = "closed";
const clients = new Set<ReturnType<typeof useQueryClient>>();
const wsListeners = new Set<(open: boolean) => void>();

function setWsState(next: WsConnectionState) {
  wsState = next;
  const open = next === "open";
  for (const fn of wsListeners) fn(open);
}

export function getBarberWsState(): WsConnectionState {
  return wsState;
}

export function subscribeBarberWsState(listener: (open: boolean) => void) {
  wsListeners.add(listener);
  listener(wsState === "open");
  return () => {
    wsListeners.delete(listener);
  };
}

function invalidateBookings(qc: ReturnType<typeof useQueryClient>, bookingId?: number) {
  scheduleBookingInvalidate(qc, bookingId);
}

let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
const pendingInvalidations = new Map<
  ReturnType<typeof useQueryClient>,
  Set<string | undefined>
>();

function scheduleBookingInvalidate(
  qc: ReturnType<typeof useQueryClient>,
  bookingId?: number,
) {
  const key = bookingId != null ? String(bookingId) : undefined;
  let ids = pendingInvalidations.get(qc);
  if (!ids) {
    ids = new Set();
    pendingInvalidations.set(qc, ids);
  }
  ids.add(key);

  if (invalidateTimer) return;
  invalidateTimer = setTimeout(() => {
    invalidateTimer = null;
    for (const [client, bookingIds] of pendingInvalidations) {
      void client.invalidateQueries({ queryKey: barberQueryKeys.bookings() });
      for (const id of bookingIds) {
        if (id != null) {
          void client.invalidateQueries({
            queryKey: [...barberQueryKeys.bookings(), id],
          });
        }
      }
    }
    pendingInvalidations.clear();
  }, 400);
}

function openSocket(token: string) {
  if (socket && activeToken === token && wsState === "open") return;
  if (socket) {
    try {
      socket.close();
    } catch {
      /* noop */
    }
    socket = null;
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
  socket.onclose = () => setWsState("closed");
  socket.onerror = () => setWsState("closed");

  socket.onmessage = (evt) => {
    try {
      const payload = JSON.parse(evt.data) as {
        event?: string;
        booking_id?: number;
        payload?: { booking_id?: number };
      };
      if (payload.event === "booking_updated") {
        for (const qc of clients) {
          invalidateBookings(qc, payload.booking_id);
        }
        return;
      }
      if (payload.event === "notification") {
        for (const qc of clients) {
          void qc.invalidateQueries({ queryKey: barberQueryKeys.notifications() });
          const bid = payload.booking_id ?? payload.payload?.booking_id;
          if (bid != null) invalidateBookings(qc, bid);
        }
      }
    } catch {
      /* noop */
    }
  };
}

/** WebSocket + bron/bildirishnoma real-time yangilanishi. */
export function useBookingLiveSync(bookingId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const token = getBarberAccessToken();
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
        closeTimer = setTimeout(() => {
          if (refCount === 0 && socket) {
            try {
              socket.close();
            } catch {
              /* noop */
            }
            socket = null;
            activeToken = null;
            setWsState("closed");
          }
          closeTimer = null;
        }, 1000);
      }
    };
  }, [qc, bookingId]);
}
