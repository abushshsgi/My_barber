import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiJson, formatApiError } from "@/lib/api";
import type { ConversationListItemApi, MessageApi, PaginatedMessagesApi } from "@/lib/api-types";

export function useConversations() {
  return useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => apiJson<ConversationListItemApi[]>("/api/v1/chat/conversations/"),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["chat", "messages", conversationId],
    enabled: !!conversationId,
    queryFn: () =>
      apiJson<PaginatedMessagesApi>(`/api/v1/chat/conversations/${encodeURIComponent(conversationId!)}/messages/`),
  });
}

export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!conversationId) throw new Error("Conversation not selected");
      const res = await apiFetch(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages/`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(formatApiError(body, "Send failed"));
      }
      return (await res.json()) as MessageApi;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
      await qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });
}

