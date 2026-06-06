import { apiJson } from "./client";
import { apiList } from "./list-utils";
import type { ApiConversation, ApiMessage } from "./types";

export async function fetchConversations(): Promise<ApiConversation[]> {
  return apiList<ApiConversation>("/api/v1/chat/conversations/");
}

export async function createConversation(barberId: number): Promise<ApiConversation> {
  return apiJson<ApiConversation>("/api/v1/chat/conversations/", {
    method: "POST",
    body: JSON.stringify({ barber_id: barberId }),
  });
}

export async function fetchMessages(conversationId: string): Promise<ApiMessage[]> {
  return apiList<ApiMessage>(`/api/v1/chat/conversations/${conversationId}/messages/`);
}

export async function sendMessage(conversationId: string, text: string): Promise<ApiMessage> {
  return apiJson<ApiMessage>(`/api/v1/chat/conversations/${conversationId}/messages/`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
