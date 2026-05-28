"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBadge, type ApiBookingStatus } from "@/components/StatusBadge";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  MessageCircle,
  Play,
  Scissors,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, formatApiError } from "@/lib/api";
import { format } from "date-fns";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NeoPage } from "@/components/neo/NeoPrimitives";

type BookingLine = { service_name: string };
type BookingRow = {
  id: number;
  salon_name: string | null;
  barber: number;
  barber_name?: string;
  customer_name?: string;
  start_at: string;
  status: string;
  total_price: string;
  lines: BookingLine[];
  has_review?: boolean;
  review_id?: number | null;
};

type ReviewDraft = {
  bookingId: number;
  rating: number;
  text: string;
};

function mapStatus(s: string): ApiBookingStatus {
  if (s === "accepted" || s === "in_progress" || s === "pending") return s as ApiBookingStatus;
  if (s === "completed") return "completed";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  return "pending";
}

function unwrapList<T>(body: T[] | { results?: T[] }): T[] {
  return Array.isArray(body) ? body : body.results || [];
}

async function fetchBookings(): Promise<BookingRow[]> {
  const res = await apiFetch("/api/v1/bookings/");
  if (!res.ok) throw new Error("Bandlar yuklanmadi");
  return unwrapList((await res.json()) as { results?: BookingRow[] } | BookingRow[]);
}

const tabs = [
  { key: "upcoming" as const, label: "Kelgusi" },
  { key: "history" as const, label: "Tarix" },
];

const lifecycleSteps = [
  { key: "pending", label: "Kutmoqda", Icon: Hourglass },
  { key: "accepted", label: "Tasdiq", Icon: Check },
  { key: "in_progress", label: "Jarayon", Icon: Play },
  { key: "completed", label: "Tugadi", Icon: CheckCircle2 },
] as const;

function lifecycleIndex(status: string) {
  if (status === "pending") return 0;
  if (status === "accepted") return 1;
  if (status === "in_progress") return 2;
  if (status === "completed") return 3;
  if (status === "cancelled" || status === "rejected") return -1;
  return 0;
}

function MyBookings() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);

  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: fetchBookings,
  });

  const cancelBooking = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/bookings/${id}/cancel/`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(body, "Bron bekor qilinmadi"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", "mine"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const openChat = useMutation({
    mutationFn: async (barberId: number) => {
      const res = await apiFetch("/api/v1/chat/conversations/", {
        method: "POST",
        body: JSON.stringify({ barber_id: barberId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(body, "Chat ochilmadi"));
      return body as { id: string };
    },
    onSuccess: (convo) => router.push(`/chat/${convo.id}`),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Chat ochilmadi");
    },
  });

  const createReview = useMutation({
    mutationFn: async (draft: ReviewDraft) => {
      const res = await apiFetch("/api/v1/reviews/", {
        method: "POST",
        body: JSON.stringify({
          booking: draft.bookingId,
          rating: draft.rating,
          text: draft.text,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(body, "Sharh saqlanmadi"));
    },
    onSuccess: () => {
      setReviewDraft(null);
      qc.invalidateQueries({ queryKey: ["bookings", "mine"] });
      qc.invalidateQueries({ queryKey: ["reviews", "mine", "count"] });
    },
  });

  const { upcoming, history } = useMemo(() => {
    const u: BookingRow[] = [];
    const h: BookingRow[] = [];
    for (const b of bookings) {
      if (b.status === "pending" || b.status === "accepted" || b.status === "in_progress") {
        u.push(b);
      } else {
        h.push(b);
      }
    }
    const byStart = (a: BookingRow, b: BookingRow) =>
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    u.sort(byStart);
    h.sort((a, b) => -byStart(a, b));
    return { upcoming: u, history: h };
  }, [bookings]);

  const list = tab === "upcoming" ? upcoming : history;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 text-center text-destructive">
        {(error as Error).message}. Tizimga kiring.
      </div>
    );
  }

  return (
    <NeoPage>
      <header className="px-5 pt-safe">
        <div className="pt-3">
          <p className="label-eyebrow">Mening profilim</p>
          <h1 className="text-[26px] font-extrabold tracking-tight text-foreground">
            Bandlarim
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Booking holati, chat va sharhlar
          </p>
        </div>
      </header>

      <div className="px-5 pt-4">
        <div className="neo-panel relative flex gap-1 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-extrabold transition"
            >
              {tab === t.key && (
                <motion.span
                  layoutId="bookings-tab-pill"
                  className="absolute inset-0 -z-0 rounded-lg border-2 border-border bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10",
                  tab === t.key ? "text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {t.label}
              </span>
              <span
                className={cn(
                  "relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  tab === t.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t.key === "upcoming" ? upcoming.length : history.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-5 pb-6 pt-5">
        <AnimatePresence mode="popLayout">
          {list.map((booking, i) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              index={i}
              onCancel={() => cancelBooking.mutate(booking.id)}
              onChat={() => openChat.mutate(booking.barber)}
              onReview={() => setReviewDraft({ bookingId: booking.id, rating: 5, text: "" })}
              busy={cancelBooking.isPending || openChat.isPending}
            />
          ))}
        </AnimatePresence>

        {list.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="neo-panel py-16 text-center"
          >
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-lg border-2 border-border bg-accent text-accent-foreground">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">Bandlar yoʻq</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Salon yoki barberni tanlab bron qiling
            </p>
          </motion.div>
        )}
      </div>

      {reviewDraft && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 px-3"
          onClick={() => setReviewDraft(null)}
        >
          <div
            className="w-full max-w-md rounded-t-[20px] border-2 border-border bg-surface p-5 pb-8 shadow-luxury"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="label-eyebrow">Sharh</p>
                <p className="font-display text-lg font-semibold text-foreground">
                  Sharh qoldirish
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewDraft(null)}
                aria-label="Yopish"
                className="grid h-10 w-10 place-items-center rounded-lg border-2 border-border bg-surface"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
            <div className="mt-4 flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReviewDraft((d) => (d ? { ...d, rating: r } : d))}
                  className="p-1.5"
                  aria-label={`${r} yulduz`}
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition",
                      r <= reviewDraft.rating
                        ? "fill-gold text-gold drop-shadow"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewDraft.text}
              onChange={(e) =>
                setReviewDraft((d) => (d ? { ...d, text: e.target.value } : d))
              }
              className="mt-4 min-h-28 w-full rounded-lg border-2 border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Xizmat haqida fikringizni yozing…"
            />
            {createReview.isError && (
              <p className="mt-2 text-xs text-destructive">
                {(createReview.error as Error).message}
              </p>
            )}
            <Button
              className="neo-cta mt-4 h-12 w-full rounded-xl border-2 border-border bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={createReview.isPending}
              onClick={() => createReview.mutate(reviewDraft)}
            >
              {createReview.isPending ? "Yuborilmoqda…" : "Sharhni yuborish"}
            </Button>
          </div>
        </div>
      )}
    </NeoPage>
  );
}

function BookingCard({
  booking,
  index,
  onCancel,
  onChat,
  onReview,
  busy,
}: {
  booking: BookingRow;
  index: number;
  onCancel: () => void;
  onChat: () => void;
  onReview: () => void;
  busy: boolean;
}) {
  const start = new Date(booking.start_at);
  const stepIndex = lifecycleIndex(booking.status);
  const canCancel = booking.status === "pending" || booking.status === "accepted";
  const canChat = booking.status !== "cancelled" && booking.status !== "rejected";
  const isCancelled = booking.status === "cancelled" || booking.status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      layout
      className="relative overflow-hidden rounded-3xl border border-border bg-surface p-4 shadow-card"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
          <Scissors className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-[15px] font-bold text-foreground">
            {booking.salon_name || booking.barber_name || "Barber"}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {booking.lines?.map((s) => s.service_name).join(", ") || "—"}
          </p>
        </div>
        <StatusBadge status={mapStatus(booking.status)} />
      </div>

      {/* Date row */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {format(start, "d MMM yyyy")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Clock className="h-3.5 w-3.5" />
          {format(start, "HH:mm")}
        </span>
        <span className="ml-auto font-display text-sm font-bold text-foreground">
          {parseFloat(booking.total_price).toLocaleString()} soʻm
        </span>
      </div>

      {/* Lifecycle Timeline */}
      {!isCancelled ? (
        <div className="mt-4">
          <div className="flex items-center gap-1">
            {lifecycleSteps.map((step, idx) => {
              const reached = stepIndex >= idx;
              const Icon = step.Icon;
              return (
                <div key={step.key} className="contents">
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full border-2 transition",
                        reached
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <span
                      className={cn(
                        "max-w-full truncate text-[10px] font-semibold",
                        reached ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < lifecycleSteps.length - 1 && (
                    <span
                      className={cn(
                        "mb-4 h-[2px] w-2 shrink-0 rounded-full",
                        stepIndex > idx ? "bg-foreground" : "bg-border",
                      )}
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          {booking.status === "cancelled" ? "Bekor qilindi" : "Rad etildi"}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {canChat && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={busy}
            onClick={onChat}
          >
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
            Chat
          </Button>
        )}
        {canCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full text-destructive hover:bg-destructive/5"
            disabled={busy}
            onClick={onCancel}
          >
            Bekor qilish
          </Button>
        )}
        {booking.status === "completed" &&
          (booking.has_review ? (
            <span className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground">
              <Check className="mr-1 h-3 w-3" /> Sharh yozilgan
            </span>
          ) : (
            <Button type="button" size="sm" className="rounded-full" onClick={onReview}>
              <Star className="mr-1.5 h-3.5 w-3.5 fill-gold text-gold" />
              Sharh yozish
            </Button>
          ))}
      </div>
    </motion.div>
  );
}

export default function MyBookingsWithAuth() {
  return (
    <AuthGate
      title="Bandlaringiz uchun kiring"
      description="Booking tarixini koʻrish uchun mijoz akkaunti kerak."
    >
      <MyBookings />
    </AuthGate>
  );
}
