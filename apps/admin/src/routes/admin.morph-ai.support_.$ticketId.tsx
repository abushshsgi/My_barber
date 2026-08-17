import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Check, Flag, Send, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { getTicketById, getTicketReplies, postTicketReply, updateTicket } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EditTicketDialog } from "@/components/admin/edit-dialogs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/morph-ai/support_/$ticketId")({
  component: MorphTicketDetailPage,
  notFoundComponent: () => (
    <div className="p-8">
      <p>Murojaat topilmadi.</p>
      <Link to="/admin/morph-ai/support" className="text-foreground underline">
        Orqaga
      </Link>
    </div>
  ),
});

function MorphTicketDetailPage() {
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

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "ticket-replies", ticketId] });
    void qc.invalidateQueries({ queryKey: ["admin", "ticket", ticketId] });
    void qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
  };

  const sendMut = useMutation({
    mutationFn: (body: string) => postTicketReply(ticketId, body),
    onSuccess: () => {
      setReply("");
      toast.success("Javob yuborildi");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (body: Parameters<typeof updateTicket>[1]) => updateTicket(ticketId, body),
    onSuccess: () => {
      setEditOpen(false);
      toast.success("Yangilandi");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = ticketQ.data;
  const replies = repliesQ.data ?? [];
  const problem = String(t?.category || "") === "morph_ai:problem";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/admin/morph-ai/support"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Morf AI yordam
      </Link>

      {t ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">
                <Flag className="size-3" />
                {problem ? "Muammo xabari" : "Yordam so'rovi"}
              </div>
              <h1 className="font-heading text-2xl font-semibold text-foreground">{t.subject}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.user_name} · {format(new Date(t.created_at), "dd MMM yyyy HH:mm")}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                label={
                  t.status === "resolved"
                    ? "Hal qilindi"
                    : t.status === "open"
                      ? "Ochiq"
                      : t.status === "pending"
                        ? "Kutilmoqda"
                        : t.status === "closed"
                          ? "Yopilgan"
                          : t.status
                }
              />
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Settings2 className="mr-1.5 size-4" /> Sozlash
              </Button>
            </div>
          </div>
          {t.body ? (
            <p className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-background/60 p-3 text-sm text-muted-foreground">
              {t.body}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {t.status !== "resolved" && t.status !== "closed" ? (
              <Button
                size="sm"
                onClick={() => updateMut.mutate({ status: "resolved" })}
                disabled={updateMut.isPending}
              >
                <Check className="mr-1.5 size-4" /> Hal qilindi
              </Button>
            ) : null}
            {t.status !== "closed" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateMut.mutate({ status: "closed" })}
                disabled={updateMut.isPending}
              >
                <X className="mr-1.5 size-4" /> Yopish
              </Button>
            ) : null}
            {t.status === "closed" || t.status === "resolved" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateMut.mutate({ status: "open" })}
                disabled={updateMut.isPending}
              >
                Qayta ochish
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {replies.map(
          (r: {
            id: number;
            author_role: string;
            author: string;
            avatar?: string;
            body: string;
            created_at: string;
          }) => (
            <div
              key={r.id}
              className={cn("flex gap-3", r.author_role === "admin" && "flex-row-reverse")}
            >
              {r.avatar ? (
                <img
                  src={r.avatar}
                  className="size-9 rounded-full object-cover ring-1 ring-border"
                  alt=""
                />
              ) : (
                <span className="grid size-9 place-items-center rounded-full bg-muted text-xs font-semibold ring-1 ring-border">
                  {(r.author || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  r.author_role === "admin"
                    ? "bg-foreground text-background"
                    : "border border-border bg-card",
                )}
              >
                <div className="mb-1 text-xs opacity-70">
                  {r.author} · {format(new Date(r.created_at), "dd MMM HH:mm")}
                </div>
                <div className="whitespace-pre-wrap">{r.body}</div>
              </div>
            </div>
          ),
        )}
      </div>

      {t?.status !== "closed" ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <Textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Javobingizni yozing..."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!reply.trim()) return;
                sendMut.mutate(reply.trim(), {
                  onSuccess: () => updateMut.mutate({ status: "resolved" }),
                });
              }}
              disabled={!reply.trim() || sendMut.isPending || updateMut.isPending}
            >
              Javob + hal qilish
            </Button>
            <Button
              onClick={() => reply.trim() && sendMut.mutate(reply.trim())}
              disabled={!reply.trim() || sendMut.isPending}
            >
              <Send className="mr-1.5 size-4" /> Yuborish
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
          Murojaat yopilgan. Qayta ochib javob yozishingiz mumkin.
        </p>
      )}

      {t ? (
        <EditTicketDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          defaultValues={{ status: t.status, priority: t.priority, assignee: t.assignee }}
          loading={updateMut.isPending}
          onSave={(v) => updateMut.mutate(v)}
        />
      ) : null}
    </div>
  );
}
