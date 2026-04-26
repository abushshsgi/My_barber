"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { LiveTimer } from "@/panel/components/LiveTimer";
import { EmptyBlock, StatusPill } from "@/adminhub-ui/barber/primitives";
import { Play, CheckCircle2, CalendarClock, Phone } from "lucide-react";
import { useState } from "react";
import type { BookingStatus } from "@/panel/contexts/AppContext";
import { cn } from "@/lib/utils";
import { formatUZS } from "@/adminhub-ui/barber/format";

const TABS = [
  { id: "all", label: "Hammasi" },
  { id: "accepted", label: "Tasdiqlangan" },
  { id: "in_progress", label: "Davom etmoqda" },
  { id: "completed", label: "Yakunlangan" },
] as const;

export default function Bookings() {
  const { bookings, startBooking, completeBooking } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");

  const filtered =
    tab === "all" ? bookings : bookings.filter((b) => b.status === (tab as BookingStatus));

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Bronlar</h1>
        <p className="text-muted-foreground text-sm mt-1">Mijozlar tomonidan qilingan barcha bronlar.</p>
      </div>

      <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 sm:px-4 py-1.5 rounded-md text-sm transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-60">
              {t.id === "all"
                ? bookings.length
                : bookings.filter((b) => b.status === (t.id as BookingStatus)).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock
          title="Bu kategoriyada bronlar yo‘q."
          description="Boshqa filter tanlab ko‘ring."
          icon={<CalendarClock className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold">
                  {booking.clientName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{booking.clientName}</div>
                  <div className="text-xs text-muted-foreground truncate">{booking.service}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Vaqt</div>
                  <div className="font-medium">
                    {booking.date} · {booking.time}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Narx</div>
                  <div className="font-medium">{formatUZS(booking.price)}</div>
                </div>

                <div className="flex items-center gap-2">
                  {booking.status === "in_progress" && booking.startedAt && (
                    <LiveTimer startedAt={booking.startedAt} className="text-sm text-muted-foreground" />
                  )}
                  <StatusPill status={booking.status} />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    className="size-9 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center"
                    title="Qo‘ng‘iroq (UI-only)"
                  >
                    <Phone className="h-4 w-4" />
                  </button>

                  {booking.status === "accepted" && (
                    <button
                      type="button"
                      onClick={() => startBooking(booking.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Boshlash
                    </button>
                  )}
                  {booking.status === "in_progress" && (
                    <button
                      type="button"
                      onClick={() => completeBooking(booking.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tugatish
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
