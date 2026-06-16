import { apiJson } from "./client";

export type ApiSupportTicket = {
  id: number;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function fetchSupportTickets(): Promise<ApiSupportTicket[]> {
  return apiJson<ApiSupportTicket[]>("/api/v1/support/tickets/");
}

export async function createSupportTicket(payload: {
  subject: string;
  body: string;
}): Promise<ApiSupportTicket> {
  return apiJson<ApiSupportTicket>("/api/v1/support/tickets/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
