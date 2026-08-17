import { apiJson } from "./client";

export type ApiSupportReply = {
  id: number;
  author_role: "admin" | "user" | "barber" | string;
  author_name: string;
  body: string;
  created_at: string;
};

export type ApiSupportTicket = {
  id: number;
  subject: string;
  body: string;
  status: string;
  category?: string;
  related_type?: string;
  related_id?: string;
  reply_count?: number;
  last_message?: string;
  last_message_role?: string;
  can_reply?: boolean;
  created_at: string;
  updated_at: string;
  replies?: ApiSupportReply[];
};

export async function fetchSupportTickets(params?: {
  kind?: "morph" | "morph_help" | "morph_problem";
  category?: string;
}): Promise<ApiSupportTicket[]> {
  const sp = new URLSearchParams();
  if (params?.kind) sp.set("kind", params.kind);
  if (params?.category) sp.set("category", params.category);
  const q = sp.toString();
  return apiJson<ApiSupportTicket[]>(`/api/v1/support/tickets/${q ? `?${q}` : ""}`);
}

export async function fetchSupportTicket(id: number): Promise<ApiSupportTicket> {
  return apiJson<ApiSupportTicket>(`/api/v1/support/tickets/${id}/`);
}

export async function createSupportTicket(payload: {
  subject: string;
  body: string;
  category?: string;
  related_type?: string;
  related_id?: string;
}): Promise<ApiSupportTicket> {
  return apiJson<ApiSupportTicket>("/api/v1/support/tickets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function replySupportTicket(id: number, body: string): Promise<ApiSupportReply> {
  return apiJson<ApiSupportReply>(`/api/v1/support/tickets/${id}/replies/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
