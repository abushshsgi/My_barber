import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { buildChatWebSocketUrl } from "@mybarber/shared/ws-url";
import { API_BASE, getUserAccessToken } from "@/lib/api/client";
import { mapMessage } from "@/lib/mappers/chat";
import { conversationsQueryKeyBase } from "@/hooks/use-chat-api";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";

type WsPayload = {
  type?: string;
  message?: {
    id: number;
    sender_kind: "USER" | "BARBER";
    text: string;
    created_at: string;
  };
};

export function useChatWebSocket(conversationId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const token = getUserAccessToken();
    if (!conversationId || !token) return;

    const ws = new WebSocket(buildChatWebSocketUrl(API_BASE, conversationId, token));

    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data) as WsPayload;
        if (payload.type !== "message" || !payload.message) return;

        const userId = getAuthUserId();
        const mapped = mapMessage(payload.message, "USER");
        const messagesKey = userQueryKey(["chat", "messages", conversationId] as const, userId);

        qc.setQueryData<Array<ReturnType<typeof mapMessage>>>(messagesKey, (prev = []) => {
          if (prev.some((m) => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
        void qc.invalidateQueries({ queryKey: conversationsQueryKeyBase });
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      ws.close();
    };
  }, [conversationId, qc]);
}
