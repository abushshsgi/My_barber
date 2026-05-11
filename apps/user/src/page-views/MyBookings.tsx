"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBadge, type ApiBookingStatus } from "@/components/StatusBadge";
import { CalendarDays, Clock, MessageCircle, Scissors, Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, formatApiError } from "@/lib/api";
import { format } from "date-fns";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/navigation";

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
  { key: "pending", label: "Kutmoqda" },
  { key: "accepted", label: "Tasdiq" },
  { key: "in_progress", label: "Jarayon" },
  { key: "completed", label: "Tugadi" },
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Clock className="h-8 w-8 animate-spin text-accent" />
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
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-12 pb-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-extrabold text-foreground tracking-tight"
        >
          Bandlarim
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-sm text-muted-foreground mt-0.5"
        >
          Booking holati, chat va sharhlar
        </motion.p>
      </div>

      <div className="px-5 py-3">
        <div className="flex gap-2 p-1 rounded-2xl bg-muted/50">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {tab === t.key && (
                <motion.div
                  layoutId="booking-tab"
                  className="absolute inset-0 bg-card shadow-sm rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={`relative z-10 flex items-center justify-center gap-1.5 ${
                  tab === t.key ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {t.key === "upcoming" ? upcoming.length : history.length}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3 pb-4">
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Bandlar yo&apos;q</p>
            <p className="text-sm text-muted-foreground">Salon tanlang va band qiling</p>
          </motion.div>
        )}
      </div>

      {reviewDraft && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-4">
          <div className="w-full rounded-3xl border border-border bg-card p-4 shadow-luxury">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-foreground">Sharh qoldirish</p>
              <button type="button" onClick={() => setReviewDraft(null)} aria-label="Yopish">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReviewDraft((d) => (d ? { ...d, rating: r } : d))}
                  className="p-1"
                  aria-label={`${r} yulduz`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      r <= reviewDraft.rating ? "fill-foreground text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewDraft.text}
              onChange={(e) => setReviewDraft((d) => (d ? { ...d, text: e.target.value } : d))}
              className="mt-3 min-h-24 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Xizmat haqida fikringiz..."
            />
            {createReview.isError && (
              <p className="mt-2 text-xs text-destructive">{(createReview.error as Error).message}</p>
            )}
            <Button
              className="mt-3 h-11 w-full rounded-2xl"
              disabled={createReview.isPending}
              onClick={() => createReview.mutate(reviewDraft)}
            >
              Sharhni yuborish
            </Button>
          </div>
        </div>
      )}
    </div>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      layout
    >
      <div className="rounded-2xl border border-border/50 bg-card p-4 transition-colors hover:border-accent/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Scissors className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-foreground">
                {booking.salon_name || booking.barber_name || "Barber"}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {booking.lines?.map((s) => s.service_name).join(", ") || "—"}
              </p>
            </div>
          </div>
          <StatusBadge status={mapStatus(booking.status)} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> {format(start, "d MMM yyyy")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {format(start, "HH:mm")}
          </span>
          <span className="ml-auto font-bold text-foreground">
            {parseFloat(booking.total_price).toLocaleString()} so&apos;m
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1">
          {lifecycleSteps.map((step, idx) => (
            <div key={step.key} className="min-w-0">
              <div
                className={`h-1 rounded-full ${
                  stepIndex >= idx ? "bg-foreground" : "bg-muted"
                }`}
              />
              <p className="mt-1 truncate text-[10px] text-muted-foreground">{step.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canChat && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-xl"
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
              className="rounded-xl text-destructive"
              disabled={busy}
              onClick={onCancel}
            >
              Bekor qilish
            </Button>
          )}
          {booking.status === "completed" && (
            booking.has_review ? (
              <span className="inline-flex h-8 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">
                Sharh yozilgan
              </span>
            ) : (
              <Button type="button" size="sm" className="rounded-xl" onClick={onReview}>
                <Star className="mr-1.5 h-3.5 w-3.5" />
                Sharh yozish
              </Button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MyBookingsWithAuth() {
  return (
    <AuthGate title="Bandlaringiz uchun kiring" description="Booking tarixini ko‘rish uchun mijoz akkaunti kerak.">
      <MyBookings />
    </AuthGate>
  );
}
