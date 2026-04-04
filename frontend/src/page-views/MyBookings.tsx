"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge, type ApiBookingStatus } from "@/components/StatusBadge";
import { CalendarDays, Clock, Scissors, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";

type BookingLine = { service_name: string };
type BookingRow = {
  id: number;
  salon_name: string | null;
  barber_name?: string;
  customer_name?: string;
  start_at: string;
  status: string;
  total_price: string;
  lines: BookingLine[];
};

function mapStatus(s: string): ApiBookingStatus {
  if (s === "accepted" || s === "in_progress" || s === "pending") return s as ApiBookingStatus;
  if (s === "completed") return "completed";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  return "pending";
}

async function fetchBookings(): Promise<BookingRow[]> {
  const res = await apiFetch("/api/v1/bookings/");
  if (!res.ok) throw new Error("Bandlar yuklanmadi");
  const j = (await res.json()) as { results?: BookingRow[] } | BookingRow[];
  return Array.isArray(j) ? j : j.results || [];
}

const tabs = [
  { key: "upcoming" as const, label: "Kelgusi" },
  { key: "completed" as const, label: "Boshqa" },
];

const MyBookings = () => {
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");

  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: fetchBookings,
  });

  const { upcoming, done } = useMemo(() => {
    const u: BookingRow[] = [];
    const d: BookingRow[] = [];
    for (const b of bookings) {
      if (
        b.status === "pending" ||
        b.status === "accepted" ||
        b.status === "in_progress"
      ) {
        u.push(b);
      } else {
        d.push(b);
      }
    }
    const byStart = (a: BookingRow, b: BookingRow) =>
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    u.sort(byStart);
    d.sort((a, b) => -byStart(a, b));
    return { upcoming: u, done: d };
  }, [bookings]);

  const list = tab === "upcoming" ? upcoming : done;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
          Barcha band qilganlaringiz
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
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    tab === t.key
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.key === "upcoming" ? upcoming.length : done.length}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3 pb-4">
        <AnimatePresence mode="popLayout">
          {list.map((booking, i) => {
            const start = new Date(booking.start_at);
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                layout
              >
                <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-accent/20 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">
                          {booking.salon_name || booking.barber_name || "Barber"}
                        </h3>
                      </div>
                    </div>
                    <StatusBadge status={mapStatus(booking.status)} />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 pl-[52px]">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {format(start, "d MMM yyyy")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {format(start, "HH:mm")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pl-[52px]">
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {booking.lines?.map((s) => s.service_name).join(", ") || "—"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-accent">
                        {parseFloat(booking.total_price).toLocaleString()} so&apos;m
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
    </div>
  );
};

export default MyBookings;
