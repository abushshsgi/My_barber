import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatusPill } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/calendar")({
  component: CalendarPage,
});

const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8..19
const DAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function CalendarPage() {
  const { bookings } = useBarberContext();
  const [weekOffset, setWeekOffset] = useState(0);

  // group today's bookings by hour for demo
  const today = bookings.filter((b) => b.date === "Today");
  const slots = useMemo(() => {
    const map = new Map<number, typeof today>();
    today.forEach((b) => {
      const h = parseInt(b.time.split(":")[0], 10);
      const arr = map.get(h) ?? [];
      arr.push(b);
      map.set(h, arr);
    });
    return map;
  }, [today]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Kalendar"
        description="Haftalik ish jadvalingiz va bronlar."
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90">
            <Plus className="size-4" />
            Bron qo'shish
          </button>
        }
      />

      {/* Week selector */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-card">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="size-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="font-heading font-medium">
          {weekOffset === 0 ? "Bu hafta" : weekOffset > 0 ? `+${weekOffset} hafta` : `${weekOffset} hafta`}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="size-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Week grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        <div className="grid grid-cols-8 border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="px-3 py-3"></div>
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "px-3 py-3 text-center border-l border-border",
                i === 0 && weekOffset === 0 && "bg-foreground text-background",
              )}
            >
              {d}
            </div>
          ))}
        </div>
        {HOURS.map((h) => (
          <div key={h} className="grid grid-cols-8 border-b border-border last:border-b-0 min-h-16">
            <div className="px-3 py-2 text-xs text-muted-foreground border-r border-border">
              {h}:00
            </div>
            {DAYS.map((_, i) => {
              const items = i === 0 && weekOffset === 0 ? slots.get(h) ?? [] : [];
              return (
                <div
                  key={i}
                  className="border-l border-border p-1 hover:bg-muted/30 transition-colors"
                >
                  {items.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-md bg-foreground text-background px-2 py-1 text-xs mb-1 truncate"
                    >
                      <div className="font-medium truncate">{b.client}</div>
                      <div className="opacity-70 truncate">{b.service}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Today summary */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-heading text-lg font-semibold mb-3">Bugungi bronlar</h2>
        <div className="space-y-2">
          {today.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40">
              <div className="text-sm font-medium w-14">{b.time}</div>
              <img src={b.client_avatar} alt="" className="size-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{b.client}</div>
                <div className="text-xs text-muted-foreground truncate">{b.service}</div>
              </div>
              <div className="text-sm">{formatUZS(b.price)}</div>
              <StatusPill status={b.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
