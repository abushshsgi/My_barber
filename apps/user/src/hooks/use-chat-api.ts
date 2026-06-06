import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createConversation,
  fetchConversations,
  fetchMessages,
  sendMessage,
} from "@/lib/api/chat";
import { authQueryEnabled } from "@/lib/auth-query";
import { mapConversation, mapMessage } from "@/lib/mappers/chat";

export const conversationsQueryKey = ["chat", "conversations"] as const;

export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async () => (await fetchConversations()).map(mapConversation),
    staleTime: 10_000,
    enabled: authQueryEnabled(),
  });
}

export function useChatMessages(conversationId: string) {
  return useQuery({
    queryKey: ["chat", "messages", conversationId],
    queryFn: async () => (await fetchMessages(conversationId)).map((m) => mapMessage(m, "USER")),
    enabled: authQueryEnabled(Boolean(conversationId)),
    refetchInterval: 15_000,
  });
}

export function useSendChatMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => sendMessage(conversationId, text),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
      void qc.invalidateQueries({ queryKey: conversationsQueryKey });
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (barberId: number) => createConversation(barberId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: conversationsQueryKey }),
  });
}
