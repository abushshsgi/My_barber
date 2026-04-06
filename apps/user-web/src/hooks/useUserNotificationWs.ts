"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/api";
import { notificationWebSocketUrl } from "@/lib/ws-url";

export function useUserNotificationWs() {
  const qc = useQueryClient();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const ws = new WebSocket(notificationWebSocketUrl(token));
    ws.onmessage = () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    };
    return () => ws.close();
  }, [qc]);
}
