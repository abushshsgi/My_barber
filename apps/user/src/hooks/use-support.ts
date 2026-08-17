import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSupportTicket,
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  type ApiSupportTicket,
} from "@/lib/api/support";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";

export const supportTicketsKey = ["support", "tickets"] as const;

export function useSupportTickets(kind?: "morph" | "morph_help" | "morph_problem") {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: [...supportTicketsKey, kind ?? "all", userId],
    queryFn: () => fetchSupportTickets(kind ? { kind } : undefined),
    enabled: authQueryEnabled(!!userId),
    refetchInterval: 15_000,
  });
}

export function useSupportTicket(ticketId: number | null) {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: ["support", "ticket", ticketId, userId],
    queryFn: () => fetchSupportTicket(ticketId as number),
    enabled: authQueryEnabled(!!userId && ticketId != null),
    refetchInterval: 12_000,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      subject: string;
      body: string;
      category?: string;
      related_type?: string;
    }) => createSupportTicket(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportTicketsKey });
    },
  });
}

export function useReplySupportTicket(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => replySupportTicket(ticketId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["support", "ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: supportTicketsKey });
    },
  });
}

export type { ApiSupportTicket };
