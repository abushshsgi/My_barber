import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationWebSocketUrl } from "@mybarber/shared/ws-url";
import { getBarberAccessToken } from "@/lib/api";
import { barberQueryKeys } from "@/hooks/use-barber-queries";
import { BARBER_SESSION_REFRESHED_EVENT } from "@/lib/barber-auth-session";

export type WsConnectionState = "connecting" | "open" | "closed";

let socket: WebSocket | null = null;
let activeToken: string | null = null;
let refCount = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsState: WsConnectionState = "closed";
const clients = new Set<ReturnType<typeof useQueryClient>>();
const wsListeners = new Set<(open: boolean) => void>();
const newBookingListeners = new Set<(bookingId: number) => void>();

/** Yangi bron WS hodisasi — global banner uchun. */
export function subscribeNewBookingAlert(listener: (bookingId: number) => void) {
  newBookingListeners.add(listener);
  return () => {
    newBookingListeners.delete(listener);
  };
}

function emitNewBookingAlert(bookingId: number) {
  for (const fn of newBookingListeners) fn(bookingId);
}

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

function scheduleReconnect() {
  if (refCount === 0 || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const token = getBarberAccessToken();
    if (token && refCount > 0) openSocket(token);
  }, 5_000);
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
  socket.onclose = () => {
    setWsState("closed");
    scheduleReconnect();
  };
  socket.onerror = () => setWsState("closed");

  socket.onmessage = (evt) => {
    try {
      const payload = JSON.parse(evt.data) as {
        event?: string;
        type?: string;
        booking_id?: number;
        payload?: { booking_id?: number; type?: string };
      };
      if (payload.event === "booking_updated") {
        for (const qc of clients) {
          invalidateBookings(qc, payload.booking_id);
        }
        return;
      }
      if (payload.event === "notification") {
        const bid = payload.booking_id ?? payload.payload?.booking_id;
        const notifType = payload.type ?? payload.payload?.type;
        if (bid != null && notifType === "new_booking") {
          emitNewBookingAlert(bid);
        }
        for (const qc of clients) {
          void qc.invalidateQueries({ queryKey: barberQueryKeys.notifications() });
          if (bid != null) invalidateBookings(qc, bid);
        }
      }
    } catch {
      /* noop */
    }
  };
}

/** WebSocket + bron/bildirishnoma real-time yangilanishi. */
export function useBookingLiveSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const token = getBarberAccessToken();
    if (!token) return;

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
    openSocket(token);

    const onSessionRefreshed = () => {
      const next = getBarberAccessToken();
      if (next) openSocket(next);
    };
    window.addEventListener(BARBER_SESSION_REFRESHED_EVENT, onSessionRefreshed);

    return () => {
      window.removeEventListener(BARBER_SESSION_REFRESHED_EVENT, onSessionRefreshed);
      clients.delete(qc);
      refCount = Math.max(0, refCount - 1);
      if (refCount === 0) {
        closeTimer = setTimeout(() => {
          if (refCount === 0 && socket) {
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
              reconnectTimer = null;
            }
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
  }, [qc]);
}
