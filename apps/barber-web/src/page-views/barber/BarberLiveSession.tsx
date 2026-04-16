"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Play, Square } from "lucide-react";
import {
  fetchBarberBookings,
  type BarberBookingRow,
} from "@/data/barber-bookings";

function pickLiveBooking(rows: BarberBookingRow[]): BarberBookingRow | null {
  const now = Date.now();
  for (const b of rows) {
    if (b.status !== "accepted" && b.status !== "in_progress") continue;
    const start = new Date(b.start_at).getTime();
    const end = new Date(b.end_at).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    if (b.status === "accepted" && now >= start && now < end) return b;
    if (b.status === "in_progress" && now < end + 4 * 60 * 60 * 1000) return b;
  }
  return null;
}

export function BarberLiveSession() {
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["barber", "bookings"],
    queryFn: fetchBarberBookings,
    refetchInterval: 15_000,
  });

  const live = useMemo(() => {
    // Recompute on tick to re-evaluate time window.
    void tick;
    return pickLiveBooking(bookings);
  }, [bookings, tick]);

  useEffect(() => {
    if (!live || live.status !== "in_progress") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  const startMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/bookings/${id}/start/`, { method: "POST" });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "bookings"] }),
  });

  const elapsedLabel = useMemo(() => {
    // Recompute on tick while timer is running.
    void tick;
    if (!live || live.status !== "in_progress") return "";
    const t0 = live.started_at
      ? new Date(live.started_at).getTime()
      : new Date(live.start_at).getTime();
    const sec = Math.max(0, Math.floor((Date.now() - t0) / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [live, tick]);

  if (isLoading) {
    return (
      <div className="mb-4 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!live) return null;

  return (
    <Card className="mb-6 border-primary/40 bg-primary/5 p-4 shadow-lg shadow-primary/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Jonli sessiya
          </p>
          <p className="mt-1 font-medium text-foreground">{live.customer_name}</p>
          <p className="text-sm text-muted-foreground">
            {live.status === "in_progress" ? (
              <>
                Vaqt: <span className="font-mono tabular-nums">{elapsedLabel}</span>
              </>
            ) : (
              "Bron vaqti boshlandi — xizmatni boshlang."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {live.status === "accepted" && (
            <Button
              className="rounded-xl gold-gradient text-gold-foreground border-0"
              disabled={startMut.isPending}
              onClick={() => startMut.mutate(live.id)}
            >
              {startMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> Xizmatni boshlash
                </>
              )}
            </Button>
          )}
          {live.status === "in_progress" && (
            <Button
              variant="secondary"
              className="rounded-xl"
              disabled={finishMut.isPending}
              onClick={() => finishMut.mutate(live.id)}
            >
              {finishMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Square className="mr-2 h-4 w-4" /> Yakunlash
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
