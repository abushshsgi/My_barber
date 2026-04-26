import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Send, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  getTicketById,
  getTicketReplies,
  postTicketReply,
  updateTicket,
} from "@/lib/mock-api-extra";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EditTicketDialog } from "@/components/admin/edit-dialogs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support/$ticketId")({
  component: TicketDetailPage,
  notFoundComponent: () => (
    <div className="p-8">
      <p>Murojaat topilmadi.</p>
      <Link to="/admin/support" className="text-foreground underline">
        Orqaga
      </Link>
    </div>
  ),
});

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const ticketQ = useQuery({
    queryKey: ["admin", "ticket", ticketId],
    queryFn: async () => {
      const t = await getTicketById(ticketId);
      if (!t) throw notFound();
      return t;
    },
  });
  const repliesQ = useQuery({
    queryKey: ["admin", "ticket-replies", ticketId],
    queryFn: () => getTicketReplies(ticketId),
  });

  const sendMut = useMutation({
    mutationFn: (body: string) => postTicketReply(ticketId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "ticket-replies", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin", "ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
      setReply("");
      toast.success("Javob yuborildi");
    },
  });

  const updateMut = useMutation({
    mutationFn: (body: Parameters<typeof updateTicket>[1]) => updateTicket(ticketId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
      setEditOpen(false);
      toast.success("Yangilandi");
    },
  });

  const t = ticketQ.data;
  const replies = repliesQ.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <Link
        to="/admin/support"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Murojaatlar
      </Link>

      {t && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-foreground">{t.subject}</h1>
              <div className="text-sm text-muted-foreground mt-1">
                {t.user_name} · {t.category} · {format(new Date(t.created_at), "dd MMM yyyy")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={
                  t.status === "resolved"
                    ? "completed"
                    : t.status === "open"
                      ? "pending"
                      : t.status === "closed"
                        ? "inactive"
                        : "confirmed"
                }
                label={t.status}
              />
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Settings2 className="size-4 mr-1.5" /> Sozlash
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {replies.map((r) => (
          <div
            key={r.id}
            className={cn("flex gap-3", r.author_role === "admin" && "flex-row-reverse")}
          >
            <img
              src={r.avatar}
              className="size-9 rounded-full object-cover ring-1 ring-border"
              alt=""
            />
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                r.author_role === "admin"
                  ? "bg-foreground text-background"
                  : "bg-card border border-border",
              )}
            >
              <div className="text-xs opacity-70 mb-1">
                {r.author} · {format(new Date(r.created_at), "dd MMM HH:mm")}
              </div>
              <div>{r.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-4 space-y-3">
        <Textarea
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Javobingizni yozing..."
        />
        <div className="flex justify-end">
          <Button
            onClick={() => reply.trim() && sendMut.mutate(reply.trim())}
            disabled={!reply.trim() || sendMut.isPending}
          >
            <Send className="size-4 mr-1.5" /> Yuborish
          </Button>
        </div>
      </div>

      {t && (
        <EditTicketDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          defaultValues={{ status: t.status, priority: t.priority, assignee: t.assignee }}
          loading={updateMut.isPending}
          onSave={(v) => updateMut.mutate(v)}
        />
      )}
    </div>
  );
}
