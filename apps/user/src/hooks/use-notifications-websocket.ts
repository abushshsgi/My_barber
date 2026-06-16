import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationWebSocketUrl } from "@mybarber/shared/ws-url";
import { getUserAccessToken } from "@/lib/api/client";
import { notificationsQueryKeyBase } from "@/hooks/use-notifications-api";

type WsPayload = {
  type?: string;
};

/** Real-time notification refresh when Django Channels + REDIS_URL are enabled. */
export function useNotificationsWebSocket() {
  const qc = useQueryClient();

  useEffect(() => {
    const token = getUserAccessToken();
    if (!token) return;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(notificationWebSocketUrl(token));
    } catch {
      return;
    }

    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data) as WsPayload;
        if (payload.type === "notification" || payload.type === "notifications") {
          void qc.invalidateQueries({ queryKey: notificationsQueryKeyBase });
        }
      } catch {
        void qc.invalidateQueries({ queryKey: notificationsQueryKeyBase });
      }
    };

    return () => {
      ws?.close();
    };
  }, [qc]);
}
