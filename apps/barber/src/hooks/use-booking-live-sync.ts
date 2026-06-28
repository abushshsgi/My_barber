import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationWebSocketUrl } from "@mybarber/shared/ws-url";
import { getBarberAccessToken } from "@/lib/api";
import { barberQueryKeys } from "@/hooks/use-barber-queries";

let socket: WebSocket | null = null;
let activeToken: string | null = null;
let refCount = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
const clients = new Set<ReturnType<typeof useQueryClient>>();

function invalidateBookings(qc: ReturnType<typeof useQueryClient>, bookingId?: number) {
  void qc.invalidateQueries({ queryKey: barberQueryKeys.bookings() });
  if (bookingId != null) {
    void qc.invalidateQueries({ queryKey: [...barberQueryKeys.bookings(), String(bookingId)] });
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
      const payload = JSON.parse(evt.data) as {
        event?: string;
        booking_id?: number;
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
          const bid = (payload as { payload?: { booking_id?: number } }).payload?.booking_id;
          if (bid != null) invalidateBookings(qc, bid);
        }
      }
    } catch {
      /* noop */
    }
  };
}

/** Bron jarayonini WebSocket orqali real-time yangilash. */
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
          }
          closeTimer = null;
        }, 1000);
      }
    };
  }, [qc, bookingId]);
}
