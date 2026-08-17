import { useCallback, useEffect, useState } from "react";
import {
  createSupportTicket,
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  type ApiSupportTicket,
  type SupportKind,
} from "../../api/support";

export function useSupportTickets(kind?: SupportKind) {
  const [tickets, setTickets] = useState<ApiSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const rows = await fetchSupportTickets(kind ? { kind } : undefined);
      setTickets(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  return { tickets, loading, error, refresh };
}

export function useSupportTicket(ticketId: number | null) {
  const [ticket, setTicket] = useState<ApiSupportTicket | null>(null);
  const [loading, setLoading] = useState(Boolean(ticketId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ticketId) return;
    setError(null);
    try {
      setTicket(await fetchSupportTicket(ticketId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    void refresh();
  }, [ticketId, refresh]);

  return { ticket, loading, error, refresh };
}

export async function submitSupportTicket(input: {
  subject: string;
  body: string;
  category: string;
  relatedType?: string;
}): Promise<ApiSupportTicket> {
  return createSupportTicket({
    subject: input.subject.trim().slice(0, 255),
    body: input.body.trim(),
    category: input.category,
    related_type: input.relatedType,
  });
}

export async function submitSupportReply(id: number, body: string) {
  return replySupportTicket(id, body.trim());
}
