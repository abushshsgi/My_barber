"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useApp } from "@/panel/contexts/AppContext";
import { PageHeader, SectionCard } from "@/adminhub-ui/barber/primitives";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8..19
const DAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export default function CalendarPage() {
  const { bookings } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = bookings.filter((b) => b.date === "Today");
  const slots = useMemo(() => {
    const map = new Map<number, typeof today>();
    today.forEach((b) => {
      const h = parseInt(b.time.split(":")[0] || "0", 10);
      const arr = map.get(h) ?? [];
      arr.push(b);
      map.set(h, arr);
    });
    return map;
  }, [today]);

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Kalendar"
        description="Haftalik ish jadvalingiz va bronlar."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Bron qo'shish
          </button>
        }
      />

      <SectionCard>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="size-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="font-medium">
            {weekOffset === 0
              ? "Bu hafta"
              : weekOffset > 0
                ? `+${weekOffset} hafta`
                : `${weekOffset} hafta`}
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="size-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </SectionCard>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-8 border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="px-3 py-3"></div>
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "px-3 py-3 text-center border-l border-border",
                i === 0 && weekOffset === 0 && "bg-foreground text-background"
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
                <div key={i} className="border-l border-border p-1 hover:bg-muted/30 transition-colors">
                  {items.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-md bg-foreground text-background px-2 py-1 text-xs mb-1 truncate"
                    >
                      <div className="font-medium truncate">{b.clientName}</div>
                      <div className="opacity-70 truncate">{b.service}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <SectionCard title="Bugungi bronlar" description={today.length ? undefined : "Bugun bronlar yo‘q."}>
        <div className="space-y-2">
          {today.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40">
              <div className="text-sm font-medium w-14">{b.time}</div>
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                {b.clientName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{b.clientName}</div>
                <div className="text-xs text-muted-foreground truncate">{b.service}</div>
              </div>
              <div className="text-sm font-medium">${b.price}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

