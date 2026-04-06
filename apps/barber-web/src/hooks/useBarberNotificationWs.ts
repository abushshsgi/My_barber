"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/api";
import { notificationWebSocketUrl } from "@/lib/ws-url";

/** Real-time invalidation when backend pushes a notification over WebSockets. */
export function useBarberNotificationWs() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const ws = new WebSocket(notificationWebSocketUrl(token));
    wsRef.current = ws;
    ws.onmessage = () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["barber", "bookings"] });
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [qc]);
}
