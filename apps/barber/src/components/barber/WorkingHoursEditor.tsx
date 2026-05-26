import { useMemo, useState } from "react";
import { Coffee, Copy, Moon, Plus, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type DayForm,
  parseBreaks,
  WEEKDAY_SHORT,
  WEEKDAYS,
} from "@/lib/barber-schedule";

type WorkingHoursEditorProps = {
  days: DayForm[];
  onChange: (days: DayForm[]) => void;
  disabled?: boolean;
};

function updateDay(days: DayForm[], weekday: number, patch: Partial<DayForm>): DayForm[] {
  return days.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d));
}

function formatBreaksText(breaks: { start: string; end: string }[]): string {
  return breaks.map((b) => `${b.start}-${b.end}`).join(", ");
}

export function WorkingHoursEditor({ days, onChange, disabled }: WorkingHoursEditorProps) {
  const [expandedWeekday, setExpandedWeekday] = useState<number | null>(0);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");

  const workingCount = useMemo(() => days.filter((d) => !d.is_day_off).length, [days]);
  const offCount = days.length - workingCount;

  const applyTemplateToAll = (sourceWeekday: number) => {
    const source = days.find((d) => d.weekday === sourceWeekday);
    if (!source || source.is_day_off) return;
    onChange(
      days.map((d) =>
        d.is_day_off
          ? d
          : {
              ...d,
              open_time: source.open_time,
              close_time: source.close_time,
              breaksText: source.breaksText,
            },
      ),
    );
  };

  const addBreak = (weekday: number) => {
    const day = days.find((d) => d.weekday === weekday);
    if (!day || day.is_day_off) return;
    try {
      const existing = parseBreaks(day.breaksText);
      const next = [...existing, { start: breakStart, end: breakEnd }];
      onChange(updateDay(days, weekday, { breaksText: formatBreaksText(next) }));
    } catch {
      onChange(updateDay(days, weekday, { breaksText: `${breakStart}-${breakEnd}` }));
    }
  };

  const removeBreak = (weekday: number, index: number) => {
    const day = days.find((d) => d.weekday === weekday);
    if (!day) return;
    const breaks = parseBreaks(day.breaksText);
    breaks.splice(index, 1);
    onChange(updateDay(days, weekday, { breaksText: formatBreaksText(breaks) }));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Sun className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Ish kunlari</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{workingCount}</p>
          <p className="text-xs text-muted-foreground">Booking uchun ochiq</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Moon className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Dam</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{offCount}</p>
          <p className="text-xs text-muted-foreground">Slotlar yopiq</p>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent p-4 sm:col-span-1">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Coffee className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Tanaffus</span>
          </div>
          <p className="mt-2 text-sm leading-snug text-muted-foreground">
            Har kunda tanaffus qo&apos;shing — slotlar avtomatik yopiladi.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {days.map((day) => {
          const isOpen = expandedWeekday === day.weekday;
          let breaks: { start: string; end: string }[] = [];
          if (!day.is_day_off) {
            try {
              breaks = parseBreaks(day.breaksText);
            } catch {
              breaks = [];
            }
          }
          const working = !day.is_day_off;

          return (
            <article
              key={day.weekday}
              className={cn(
                "overflow-hidden rounded-2xl border transition-shadow",
                working
                  ? "border-foreground/15 bg-card shadow-sm"
                  : "border-border/80 bg-muted/20",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => setExpandedWeekday(isOpen ? null : day.weekday)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60"
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                    working
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {WEEKDAY_SHORT[day.weekday]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{WEEKDAYS[day.weekday]}</p>
                  <p className="text-xs text-muted-foreground">
                    {working
                      ? `${day.open_time} – ${day.close_time}${breaks.length ? ` · ${breaks.length} tanaffus` : ""}`
                      : "Dam olish kuni"}
                  </p>
                </div>
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {working ? "Ish" : "Dam"}
                  </span>
                  <Switch
                    checked={working}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      onChange(
                        updateDay(days, day.weekday, {
                          is_day_off: !checked,
                          breaksText: checked ? day.breaksText || "12:00-13:00" : "",
                        }),
                      )
                    }
                    aria-label={`${WEEKDAYS[day.weekday]} ish kuni`}
                  />
                </div>
              </button>

              {isOpen && working ? (
                <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Ochilish</span>
                      <input
                        type="time"
                        value={day.open_time}
                        disabled={disabled}
                        onChange={(e) =>
                          onChange(updateDay(days, day.weekday, { open_time: e.target.value }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                    </label>
                    <span className="hidden pb-3 text-muted-foreground sm:block">→</span>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Yopilish</span>
                      <input
                        type="time"
                        value={day.close_time}
                        disabled={disabled}
                        onChange={(e) =>
                          onChange(updateDay(days, day.weekday, { close_time: e.target.value }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Tanaffuslar</span>
                    <div className="flex flex-wrap gap-2">
                      {breaks.map((br, idx) => (
                        <span
                          key={`${br.start}-${br.end}-${idx}`}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-950 dark:text-amber-100"
                        >
                          {br.start} – {br.end}
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => removeBreak(day.weekday, idx)}
                            className="rounded-full p-0.5 hover:bg-amber-500/20 disabled:opacity-50"
                            aria-label="Tanaffusni olib tashlash"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      {breaks.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Tanaffus qo&apos;shilmagan</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <input
                        type="time"
                        value={breakStart}
                        disabled={disabled}
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="h-10 w-[7.5rem] rounded-lg border border-border bg-background px-2 text-sm"
                      />
                      <input
                        type="time"
                        value={breakEnd}
                        disabled={disabled}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="h-10 w-[7.5rem] rounded-lg border border-border bg-background px-2 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        className="h-10 gap-1"
                        onClick={() => addBreak(day.weekday)}
                      >
                        <Plus className="size-3.5" />
                        Qo&apos;shish
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="gap-2 text-muted-foreground"
                    onClick={() => applyTemplateToAll(day.weekday)}
                  >
                    <Copy className="size-3.5" />
                    Barcha ish kunlariga nusxalash
                  </Button>
                </div>
              ) : null}

              {isOpen && !working ? (
                <p className="border-t border-border/60 px-4 pb-4 pt-3 text-sm text-muted-foreground">
                  Bu kunda bron qabul qilinmaydi. Ish kunini yoqish uchun yuqoridagi tugmani bosing.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
