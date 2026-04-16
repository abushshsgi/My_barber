"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { uz } from "date-fns/locale";
import { Loader2, Phone, Play, Square, CalendarClock } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  fetchBarberBookings,
  type BarberBookingRow,
} from "@/data/barber-bookings";

const ACTIVE = new Set(["pending", "accepted", "in_progress"]);
const PAST = new Set(["completed", "cancelled", "rejected"]);

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    pending: "Kutilmoqda",
    accepted: "Tasdiqlandi",
    in_progress: "Jarayonda",
    completed: "Bajarildi",
    cancelled: "Bekor",
    rejected: "Rad etildi",
  };
  return m[s] ?? s;
}

function isNewBooking(b: BarberBookingRow): boolean {
  const c = Date.parse(b.created_at);
  if (Number.isNaN(c)) return false;
  return Date.now() - c < 24 * 60 * 60 * 1000;
}

function formatMoney(v: string) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return `${v} so'm`;
  return `${Math.round(n).toLocaleString()} so'm`;
}

function useElapsed(
  booking: BarberBookingRow | null,
  tick: number,
): string {
  return useMemo(() => {
    // Recompute on tick while in_progress (UI timer)
    void tick;
    if (!booking || booking.status !== "in_progress") return "";
    const raw = booking.started_at || booking.start_at;
    const t0 = new Date(raw).getTime();
    if (Number.isNaN(t0)) return "";
    const sec = Math.max(0, Math.floor((Date.now() - t0) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [booking, tick]);
}

export default function BarberBookings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["barber", "bookings"],
    queryFn: fetchBarberBookings,
    refetchInterval: 20_000,
  });

  const upcoming = useMemo(() => {
    return bookings
      .filter((b) => ACTIVE.has(b.status))
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );
  }, [bookings]);

  const past = useMemo(() => {
    return bookings
      .filter((b) => PAST.has(b.status))
      .sort(
        (a, b) =>
          new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
      );
  }, [bookings]);

  const list = tab === "upcoming" ? upcoming : past;
  const selected = useMemo(
    () => bookings.find((b) => b.id === selectedId) ?? null,
    [bookings, selectedId],
  );

  useEffect(() => {
    if (!selected || selected.status !== "in_progress") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [selected]);

  const elapsed = useElapsed(selected, tick);

  const startMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/bookings/${id}/start/`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Boshlash muvaffaqiyatsiz");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "bookings"] }),
  });

  const finishMut = useMutation({
    mutationFn: async (id: number) => {
      const fd = new FormData();
      fd.append("early_finish", "true");
      fd.append("portfolio_allowed", "false");
      const res = await apiFetch(`/api/v1/bookings/${id}/complete/`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Yakunlash muvaffaqiyatsiz");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["barber", "bookings"] });
      setSelectedId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-5 md:max-w-2xl md:pb-10 md:pt-8">
      <div className="mb-6 hidden md:block">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Bronlar
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Mijoz bandlari
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Yangi bron shu yerda ko‘rinadi. Tanlang va xizmatni boshlang — taymer
          ketadi.
        </p>
      </div>

      <div className="mb-4 flex gap-2 rounded-2xl border border-border/50 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => {
            setTab("upcoming");
            setSelectedId(null);
          }}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
            tab === "upcoming"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Kelgusi {upcoming.length ? `· ${upcoming.length}` : ""}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("past");
            setSelectedId(null);
          }}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
            tab === "past"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          O‘tgan {past.length ? `· ${past.length}` : ""}
        </button>
      </div>

      {list.length === 0 && (
        <Card className="border-dashed border-border/60 bg-card/40 p-8 text-center">
          <CalendarClock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {tab === "upcoming"
              ? "Hozircha faol bron yo‘q."
              : "Yakunlangan bronlar shu yerda."}
          </p>
        </Card>
      )}

      <ul className="space-y-2">
        {list.map((b) => {
          const activeRow = selectedId === b.id;
          const isNew = isNewBooking(b);
          const start = parseISO(b.start_at);
          const when = format(start, "d MMM yyyy, HH:mm", { locale: uz });
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setSelectedId(activeRow ? null : b.id)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                  activeRow
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/50 bg-card/60 hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{b.customer_name}</span>
                      {isNew && tab === "upcoming" && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Yangi
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {when}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {b.lines?.map((l) => l.service_name).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                        b.status === "in_progress" &&
                          "bg-accent/20 text-accent-foreground",
                        b.status === "accepted" &&
                          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                        b.status === "pending" &&
                          "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                        ["completed", "cancelled", "rejected"].includes(
                          b.status,
                        ) && "bg-muted text-muted-foreground",
                      )}
                    >
                      {statusLabel(b.status)}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Card className="border-primary/30 bg-primary/5 p-4 shadow-lg shadow-primary/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Tanlangan bron
            </p>
            <p className="mt-1 text-lg font-semibold">{selected.customer_name}</p>
            {selected.customer_phone && (
              <a
                href={`tel:${selected.customer_phone.replace(/\s/g, "")}`}
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary"
              >
                <Phone className="h-4 w-4" />
                {selected.customer_phone}
              </a>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {format(parseISO(selected.start_at), "d MMMM yyyy, HH:mm", {
                locale: uz,
              })}
            </p>
            <ul className="mt-3 space-y-1 border-t border-border/40 pt-3 text-sm">
              {selected.lines?.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span>{l.service_name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(l.price)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right text-sm font-medium">
              Jami: {formatMoney(selected.total_price)}
            </p>

            {selected.status === "in_progress" && (
              <p className="mt-3 text-center">
                <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                  {elapsed}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  davom etmoqda
                </span>
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {selected.status === "accepted" && (
                <Button
                  className="rounded-xl gold-gradient border-0 text-gold-foreground"
                  disabled={startMut.isPending}
                  onClick={() => startMut.mutate(selected.id)}
                >
                  {startMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Xizmatni boshlash
                    </>
                  )}
                </Button>
              )}
              {selected.status === "in_progress" && (
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  disabled={finishMut.isPending}
                  onClick={() => finishMut.mutate(selected.id)}
                >
                  {finishMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      Yakunlash
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
