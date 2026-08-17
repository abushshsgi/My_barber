import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, HelpCircle, LifeBuoy, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAuthUserId } from "@/lib/auth-user";
import {
  useCreateSupportTicket,
  useReplySupportTicket,
  useSupportTicket,
  useSupportTickets,
} from "@/hooks/use-support";
import type { ApiSupportTicket } from "@/lib/api/support";

type Mode = "help" | "report";

type Props = {
  mode: Mode;
};

const PROBLEM_TOPICS = [
  { id: "tryon", subjectKey: "aiStylePage.support.subjectTryOn" },
  { id: "chat", subjectKey: "aiStylePage.support.subjectChat" },
  { id: "limit", subjectKey: "aiStylePage.support.subjectLimit" },
  { id: "quality", subjectKey: "aiStylePage.support.subjectQuality" },
  { id: "other", subjectKey: "aiStylePage.support.subjectOther" },
] as const;

function statusLabel(status: string, t: (k: string, o?: object) => string) {
  if (status === "open") return t("aiStylePage.support.statusOpen");
  if (status === "pending") return t("aiStylePage.support.statusPending");
  if (status === "resolved") return t("aiStylePage.support.statusResolved");
  if (status === "closed") return t("aiStylePage.support.statusClosed");
  return status;
}

function statusClass(status: string) {
  if (status === "open") return "bg-emerald-400/15 text-emerald-200";
  if (status === "pending") return "bg-amber-400/15 text-amber-200";
  if (status === "resolved") return "bg-sky-400/15 text-sky-200";
  return "bg-white/10 text-white/50";
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function MorphAiSupportPage({ mode }: Props) {
  const { t } = useTranslation();
  const userId = getAuthUserId();
  const [ticketId, setTicketId] = useState<number | null>(null);
  const kind = mode === "help" ? "morph_help" : "morph_problem";

  return (
    <div
      className="min-h-[100dvh] bg-[#050505] text-white"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <Link
            to="/ai-style"
            className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/[0.06] text-white ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/10"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Morf AI
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {mode === "help"
                ? t("aiStylePage.support.helpTitle")
                : t("aiStylePage.support.reportTitle")}
            </h1>
          </div>
          {mode === "help" ? (
            <Link
              to="/ai-style/report"
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/[0.06] text-white ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/10"
              aria-label={t("aiStylePage.support.reportTitle")}
            >
              <Flag className="size-4" />
            </Link>
          ) : (
            <Link
              to="/ai-style/help"
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/[0.06] text-white ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/10"
              aria-label={t("aiStylePage.support.helpTitle")}
            >
              <HelpCircle className="size-4" />
            </Link>
          )}
        </div>

        {ticketId ? (
          <TicketThread ticketId={ticketId} onBack={() => setTicketId(null)} />
        ) : (
          <div className="mt-6 space-y-6">
            {mode === "help" ? <HelpFaq /> : <ReportLead />}
            {userId ? (
              <>
                <ComposeCard mode={mode} onCreated={(ticket) => setTicketId(ticket.id)} />
                <TicketList kind={kind} onOpen={setTicketId} />
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
                {t("aiStylePage.support.loginHint")}{" "}
                <Link to="/auth" className="font-semibold text-white underline">
                  {t("common.login", { defaultValue: "Kirish" })}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HelpFaq() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    { q: t("aiStylePage.support.faq.tryOnQ"), a: t("aiStylePage.support.faq.tryOnA") },
    { q: t("aiStylePage.support.faq.limitQ"), a: t("aiStylePage.support.faq.limitA") },
    { q: t("aiStylePage.support.faq.chatQ"), a: t("aiStylePage.support.faq.chatA") },
    { q: t("aiStylePage.support.faq.waitQ"), a: t("aiStylePage.support.faq.waitA") },
  ];
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => setOpen(expanded ? null : i)}
            className="w-full cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left transition-colors duration-200 hover:bg-white/[0.07]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold">{item.q}</p>
              <HelpCircle
                className={cn(
                  "size-4 shrink-0 text-white/40 transition-transform duration-200",
                  expanded && "rotate-12 text-white/70",
                )}
              />
            </div>
            {expanded ? (
              <p className="mt-2 text-sm leading-relaxed text-white/55">{item.a}</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ReportLead() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-white/70">
        <Flag className="size-4" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          {t("aiStylePage.support.reportEyebrow")}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        {t("aiStylePage.support.reportLead")}
      </p>
    </div>
  );
}

function ComposeCard({
  mode,
  onCreated,
}: {
  mode: Mode;
  onCreated: (ticket: ApiSupportTicket) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateSupportTicket();
  const [topic, setTopic] = useState<(typeof PROBLEM_TOPICS)[number]["id"]>("tryon");
  const [subject, setSubject] = useState(
    mode === "help" ? t("aiStylePage.support.helpSubject") : t("aiStylePage.support.subjectTryOn"),
  );
  const [body, setBody] = useState("");

  const submit = () => {
    create.mutate(
      {
        subject: (subject.trim() || t("aiStylePage.support.helpSubject")).slice(0, 255),
        body: body.trim(),
        category: mode === "help" ? "morph_ai:help" : "morph_ai:problem",
        related_type: "morph_ai",
      },
      {
        onSuccess: (ticket) => {
          toast.success(t("aiStylePage.support.sent"));
          setBody("");
          onCreated(ticket);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="flex items-center gap-2 px-4 pt-4 text-white/70">
        <LifeBuoy className="size-4" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          {mode === "help" ? t("aiStylePage.support.askTitle") : t("aiStylePage.support.formTitle")}
        </p>
      </div>
      {mode === "report" ? (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {PROBLEM_TOPICS.map((item) => {
            const active = topic === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTopic(item.id);
                  setSubject(t(item.subjectKey));
                }}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
                  active ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/15",
                )}
              >
                {t(`aiStylePage.support.topic.${item.id}`)}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="space-y-2 p-4">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("aiStylePage.support.subjectPh")}
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder={
            mode === "help"
              ? t("aiStylePage.support.helpBodyPh")
              : t("aiStylePage.support.reportBodyPh")
          }
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/25"
        />
        <button
          type="button"
          disabled={body.trim().length < 5 || create.isPending}
          onClick={submit}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black transition-opacity duration-200 disabled:opacity-40"
        >
          <Send className="size-4" />
          {create.isPending
            ? t("aiStylePage.support.sending")
            : mode === "help"
              ? t("aiStylePage.support.sendHelp")
              : t("aiStylePage.support.sendReport")}
        </button>
      </div>
    </div>
  );
}

function TicketList({
  kind,
  onOpen,
}: {
  kind: "morph_help" | "morph_problem";
  onOpen: (id: number) => void;
}) {
  const { t } = useTranslation();
  const q = useSupportTickets(kind);
  const rows = q.data ?? [];
  return (
    <div>
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
        {t("aiStylePage.support.myTickets")}
      </p>
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.06]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/50">
          {t("aiStylePage.support.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => onOpen(ticket.id)}
                className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.07]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{ticket.subject}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        statusClass(ticket.status),
                      )}
                    >
                      {statusLabel(ticket.status, t)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-white/50">
                    {ticket.last_message || ticket.body}
                  </p>
                  <p className="mt-1 text-[11px] text-white/35">
                    #{ticket.id} · {formatWhen(ticket.updated_at)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TicketThread({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const detailQ = useSupportTicket(ticketId);
  const replyM = useReplySupportTicket(ticketId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const ticket = detailQ.data;
  const replies = ticket?.replies ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length, ticketId]);

  const send = useMutation({
    mutationFn: () => replyM.mutateAsync(text.trim()),
    onSuccess: () => {
      setText("");
      toast.success(t("aiStylePage.support.replySent"));
      void qc.invalidateQueries({ queryKey: ["support", "ticket", ticketId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 flex min-h-[70vh] flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white/50 transition-colors duration-200 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        {t("aiStylePage.support.myTickets")}
      </button>
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{ticket?.subject ?? "…"}</p>
            <p className="mt-1 text-xs text-white/40">Ticket #{ticketId}</p>
          </div>
          {ticket ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold",
                statusClass(ticket.status),
              )}
            >
              {statusLabel(ticket.status, t)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {detailQ.isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.06]" />
            ))
          : replies.map((r) => {
              const mine = r.author_role === "user";
              return (
                <div
                  key={`${r.id}-${r.created_at}`}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                      mine
                        ? "rounded-br-md bg-white text-black"
                        : "rounded-bl-md border border-white/10 bg-white/[0.06]",
                    )}
                  >
                    <p
                      className={cn(
                        "mb-1 text-[10px] font-bold uppercase tracking-wide",
                        mine ? "opacity-50" : "text-white/40",
                      )}
                    >
                      {mine ? t("aiStylePage.support.you") : r.author_name || "Support"} ·{" "}
                      {formatWhen(r.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{r.body}</p>
                  </div>
                </div>
              );
            })}
        <div ref={bottomRef} />
      </div>
      {ticket?.can_reply !== false && ticket?.status !== "closed" ? (
        <div className="flex items-end gap-2 border-t border-white/10 pt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={t("aiStylePage.support.replyPh")}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm outline-none placeholder:text-white/35 focus:border-white/25"
          />
          <button
            type="button"
            disabled={!text.trim() || send.isPending}
            onClick={() => send.mutate()}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-white text-black disabled:opacity-40"
            aria-label={t("aiStylePage.support.send")}
          >
            <Send className="size-4" />
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-white/[0.06] px-3 py-2 text-center text-xs text-white/45">
          {t("aiStylePage.support.closedHint")}
        </p>
      )}
    </div>
  );
}
