import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createConversation,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
} from "@/lib/api/chat";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";
import { userQueryKey } from "@/lib/query-keys";
import { mapConversation, mapMessage } from "@/lib/mappers/chat";

export const conversationsQueryKeyBase = ["chat", "conversations"] as const;

export function conversationsQueryKeyFor(userId: number | null) {
  return userQueryKey(conversationsQueryKeyBase, userId);
}

export function useConversations() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: conversationsQueryKeyFor(userId),
    queryFn: async () => (await fetchConversations()).map(mapConversation),
    staleTime: 10_000,
    enabled: authQueryEnabled(!!userId),
  });
}

export function useChatMessages(conversationId: string) {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: userQueryKey(["chat", "messages", conversationId] as const, userId),
    queryFn: async () => (await fetchMessages(conversationId)).map((m) => mapMessage(m, "USER")),
    enabled: authQueryEnabled(!!userId && Boolean(conversationId)),
    refetchInterval: false,
  });
}

export function useSendChatMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => sendMessage(conversationId, text),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
      void qc.invalidateQueries({ queryKey: conversationsQueryKeyBase });
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (barberId: number) => createConversation(barberId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: conversationsQueryKeyBase }),
  });
}

export function useMarkConversationRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: conversationsQueryKeyBase });
    },
  });
}
