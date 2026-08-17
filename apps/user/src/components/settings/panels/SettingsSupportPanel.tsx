import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Headphones, LifeBuoy, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { cn } from "@/lib/utils";
import {
  createSupportTicket,
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  type ApiSupportTicket,
} from "@/lib/api/support";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";

const FAQ = [
  {
    q: "Qanday qilib salon band qilaman?",
    a: "Bosh sahifadan salonni tanlang, xizmat va vaqtni belgilang, so'ng tasdiqlang.",
  },
  {
    q: "Bekor qilsam, pul qaytariladimi?",
    a: "Ha, agar buyurtmadan 2 soat oldin bekor qilsangiz to'liq qaytariladi.",
  },
  {
    q: "Sartarosh bilan qanday bog'lanaman?",
    a: "Buyurtma tasdiqlangach Chat orqali bevosita yozishingiz mumkin.",
  },
  {
    q: "Sharhni qanday qoldiraman?",
    a: "Buyurtma yakunlangach Buyurtmalarim sahifasidan sharh yoza olasiz.",
  },
];

const TOPICS = [
  { id: "general", label: "Umumiy savol", subject: "Umumiy savol" },
  { id: "morph", label: "Morf AI", subject: "Morf AI yordam" },
  { id: "payment", label: "To'lov / hamyon", subject: "To'lov yoki hamyon muammosi" },
  { id: "gift", label: "Sovg'a kartasi", subject: "Sovg'a kartasi shikoyati" },
  { id: "booking", label: "Bron / bekor", subject: "Bron yoki bekor qilish" },
  { id: "other", label: "Boshqa", subject: "" },
] as const;

function statusLabel(status: string) {
  if (status === "open") return "Ochiq";
  if (status === "pending") return "Javob kutilmoqda";
  if (status === "resolved") return "Hal qilindi";
  if (status === "closed") return "Yopilgan";
  return status;
}

function statusClass(status: string) {
  if (status === "open") return "bg-emerald-500/15 text-emerald-800";
  if (status === "pending") return "bg-amber-500/15 text-amber-900";
  if (status === "resolved") return "bg-sky-500/15 text-sky-900";
  if (status === "closed") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function TicketThread({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const userId = getAuthUserId();

  const detailQ = useQuery({
    queryKey: ["support", "ticket", ticketId, userId],
    queryFn: () => fetchSupportTicket(ticketId),
    enabled: authQueryEnabled(!!userId),
    refetchInterval: 12_000,
  });

  const replyM = useMutation({
    mutationFn: () => replySupportTicket(ticketId, text.trim()),
    onSuccess: async () => {
      setText("");
      await qc.invalidateQueries({ queryKey: ["support", "ticket", ticketId] });
      await qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      toast.success("Xabar yuborildi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ticket = detailQ.data;
  const replies = ticket?.replies ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length, ticketId]);

  return (
    <div className="flex min-h-[70vh] flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Murojaatlar
      </button>

      <ProfileSubpageCard className="mb-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold leading-snug">{ticket?.subject ?? "…"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ticket #{ticketId}</p>
          </div>
          {ticket ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold",
                statusClass(ticket.status),
              )}
            >
              {statusLabel(ticket.status)}
            </span>
          ) : null}
        </div>
        {ticket?.related_type === "gift_transfer" && ticket.related_id ? (
          <p className="rounded-xl bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
            Sovg&apos;a TX: <span className="font-mono text-foreground">{ticket.related_id}</span>
          </p>
        ) : null}
      </ProfileSubpageCard>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {detailQ.isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
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
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                      mine
                        ? "rounded-br-md bg-foreground text-background"
                        : "rounded-bl-md border border-border bg-card",
                    )}
                  >
                    <p
                      className={cn(
                        "mb-1 text-[10px] font-bold uppercase tracking-wide",
                        mine ? "opacity-70" : "text-muted-foreground",
                      )}
                    >
                      {mine ? "Siz" : r.author_name || "Support"} · {formatWhen(r.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{r.body}</p>
                  </div>
                </div>
              );
            })}
        <div ref={bottomRef} />
      </div>

      {ticket?.can_reply !== false && ticket?.status !== "closed" ? (
        <div className="sticky bottom-0 border-t border-border bg-background/95 pt-3 backdrop-blur">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Javob yozing..."
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
            />
            <button
              type="button"
              disabled={!text.trim() || replyM.isPending}
              onClick={() => replyM.mutate()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background disabled:opacity-40"
              aria-label="Yuborish"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
          Bu murojaat yopilgan — yangi murojaat oching.
        </p>
      )}
    </div>
  );
}

function NewComplaintForm({ onCreated }: { onCreated: (ticket: ApiSupportTicket) => void }) {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("general");
  const [subject, setSubject] = useState(TOPICS[0].subject);
  const [body, setBody] = useState("");
  const qc = useQueryClient();

  const createTicket = useMutation({
    mutationFn: () =>
      createSupportTicket({
        subject: (subject.trim() || TOPICS.find((t) => t.id === topic)?.label || "Murojaat").slice(
          0,
          255,
        ),
        body: body.trim(),
        category:
          topic === "gift"
            ? "gift_complaint"
            : topic === "morph"
              ? "morph_ai:help"
              : `user_support:${topic}`,
        related_type: topic === "morph" ? "morph_ai" : undefined,
      }),
    onSuccess: (ticket) => {
      toast.success("Shikoyat yuborildi — support javob beradi");
      setBody("");
      void qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      onCreated(ticket);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ProfileSubpageCard className="space-y-4 overflow-hidden p-0">
      <div className="bg-gradient-to-br from-foreground via-foreground to-foreground/85 px-4 py-5 text-background">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 opacity-80" />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/70">
            Shikoyat / murojaat
          </p>
        </div>
        <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight">
          Muammoni yozing — biz javob beramiz
        </h2>
        <p className="mt-1 text-sm text-background/75">
          To&apos;lov, sovg&apos;a, bron yoki boshqa masala. Dialog ochiladi.
        </p>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Mavzu
          </p>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTopic(t.id);
                  if (t.subject) setSubject(t.subject);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  topic === t.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Qisqa sarlavha"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Nima bo'ldi? Summa, sana, telefon yoki TX ID bo'lsa yozing..."
          rows={5}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
        />
        <button
          type="button"
          disabled={!subject.trim() || body.trim().length < 5 || createTicket.isPending}
          onClick={() => createTicket.mutate()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {createTicket.isPending ? "Yuborilmoqda..." : "Shikoyatni yuborish"}
        </button>
      </div>
    </ProfileSubpageCard>
  );
}

export function SettingsSupportPanel({ embedded = false }: { embedded?: boolean }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const userId = getAuthUserId();

  const ticketsQ = useQuery({
    queryKey: ["support", "tickets", userId],
    queryFn: fetchSupportTickets,
    enabled: authQueryEnabled(!!userId),
    refetchInterval: 15_000,
  });

  if (activeTicketId) {
    return <TicketThread ticketId={activeTicketId} onBack={() => setActiveTicketId(null)} />;
  }

  return (
    <div
      className={
        embedded
          ? "mt-4 grid gap-6 lg:grid-cols-2 lg:items-start"
          : "grid gap-6 lg:grid-cols-2 lg:items-start"
      }
    >
      <div className="space-y-3">
        <ProfileSubpageCard className="flex items-start gap-3 border-border/80 bg-gradient-to-br from-card to-surface/40">
          <div className="rounded-2xl bg-foreground/5 p-2.5">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Yordam markazi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Avval FAQ ni ko&apos;ring. Bo&apos;lmasa — shikoyat yozing, support bilan chat
              ochiladi.
            </p>
          </div>
        </ProfileSubpageCard>

        <Link
          to="/ai-style/help"
          className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-foreground/25"
        >
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">Morf AI yordam</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try-on, chat va limit savollari Morph AI supportga tushadi.
            </p>
          </div>
        </Link>

        {FAQ.map((item, i) => {
          const isOpen = openFaq === i;
          return (
            <ProfileSubpageCard key={item.q} className="overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <span className="text-sm font-bold">{item.q}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen ? (
                <p className="border-t border-border bg-surface/40 px-4 py-4 text-sm text-muted-foreground">
                  {item.a}
                </p>
              ) : null}
            </ProfileSubpageCard>
          );
        })}

        <ProfileSubpageCard className="border-foreground bg-foreground text-background">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/70">
            Bog&apos;lanish
          </p>
          <p className="mt-2 text-base font-bold">support@mysaloon.uz</p>
          <p className="mt-1 text-sm text-background/80">+998 71 123 45 67</p>
        </ProfileSubpageCard>
      </div>

      <div className="space-y-4">
        {userId ? (
          <>
            <NewComplaintForm onCreated={(t) => setActiveTicketId(t.id)} />

            <div>
              <div className="mb-2 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Mening murojaatlarim
                </p>
              </div>
              {(ticketsQ.data?.length ?? 0) === 0 ? (
                <ProfileSubpageCard>
                  <p className="text-sm text-muted-foreground">
                    Hali murojaat yo&apos;q. Yuqoridan yozib yuboring.
                  </p>
                </ProfileSubpageCard>
              ) : (
                <ul className="space-y-2">
                  {ticketsQ.data?.map((ticket) => (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTicketId(ticket.id)}
                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/25"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold">{ticket.subject}</p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                statusClass(ticket.status),
                              )}
                            >
                              {statusLabel(ticket.status)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {ticket.last_message || ticket.body || "—"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            #{ticket.id} · {formatWhen(ticket.updated_at)}
                            {ticket.reply_count ? ` · ${ticket.reply_count} xabar` : ""}
                          </p>
                        </div>
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 -rotate-90 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <ProfileSubpageCard>
            <p className="text-sm text-muted-foreground">
              Shikoyat yozish uchun{" "}
              <Link to="/auth" className="font-bold text-foreground underline">
                tizimga kiring
              </Link>
              .
            </p>
          </ProfileSubpageCard>
        )}
      </div>
    </div>
  );
}
