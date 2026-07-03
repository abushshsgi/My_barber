import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiFetch, apiList, formatApiError } from "@/lib/api";
import type { DayForm } from "@/lib/barber-schedule";
import { WEEKDAY_SHORT } from "@/lib/barber-schedule";
import { cn } from "@/lib/utils";

type BreakInterval = { start: string; end: string };

type ScheduleException = {
  id: number;
  date: string;
  is_day_off: boolean;
  open_time: string | null;
  close_time: string | null;
  breaks: BreakInterval[];
  note: string;
};

type Props = {
  scope: "salon" | "independent";
  membershipId: number | null;
  weeklyDays: DayForm[];
  advanceMinDays: number;
  advanceMaxDays: number;
  disabled?: boolean;
};

function apiBase(scope: "salon" | "independent") {
  return scope === "salon" ? "/api/v1/schedule-exceptions" : "/api/v1/barber/schedule-exceptions";
}

function dateKeyOffset(daysFromToday: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function formatDateShort(iso: string): { day: string; month: string; weekday: string } {
  try {
    const dt = new Date(`${iso}T12:00:00`);
    return {
      weekday: dt.toLocaleDateString("uz-UZ", { weekday: "short" }),
      day: dt.toLocaleDateString("uz-UZ", { day: "numeric" }),
      month: dt.toLocaleDateString("uz-UZ", { month: "short" }),
    };
  } catch {
    return { weekday: "", day: iso, month: "" };
  }
}

function weeklyForDate(iso: string, weeklyDays: DayForm[]): DayForm | undefined {
  const wd = new Date(`${iso}T12:00:00`).getDay();
  const weekday = wd === 0 ? 6 : wd - 1;
  return weeklyDays.find((d) => d.weekday === weekday);
}

export function AdvanceDayPlanner({
  scope,
  membershipId,
  weeklyDays,
  advanceMinDays,
  advanceMaxDays,
  disabled,
}: Props) {
  const [items, setItems] = useState<ScheduleException[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const blocked = scope === "salon" && !membershipId;

  const windowDates = useMemo(() => {
    const out: string[] = [];
    for (let d = advanceMinDays; d <= advanceMaxDays; d++) {
      out.push(dateKeyOffset(d));
    }
    return out;
  }, [advanceMinDays, advanceMaxDays]);

  useEffect(() => {
    if (windowDates[0] && !expandedDate) setExpandedDate(windowDates[0]);
  }, [windowDates, expandedDate]);

  const load = useCallback(async () => {
    if (blocked) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query = scope === "salon" ? `?membership=${membershipId}&upcoming=1` : "?upcoming=1";
      const rows = await apiList<ScheduleException>(`${apiBase(scope)}${query}`);
      setItems(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }, [scope, membershipId, blocked]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => new Map(items.map((i) => [i.date, i])), [items]);

  const upsertDay = async (
    date: string,
    patch: Partial<Pick<ScheduleException, "is_day_off" | "open_time" | "close_time" | "breaks" | "note">>,
  ) => {
    if (blocked) return;
    setSavingDate(date);
    try {
      const existing = byDate.get(date);
      const weekly = weeklyForDate(date, weeklyDays);
      const body: Record<string, unknown> = {
        date,
        is_day_off: patch.is_day_off ?? existing?.is_day_off ?? false,
        open_time: patch.open_time !== undefined ? patch.open_time : existing?.open_time ?? null,
        close_time: patch.close_time !== undefined ? patch.close_time : existing?.close_time ?? null,
        breaks: patch.breaks ?? existing?.breaks ?? [],
        note: patch.note ?? existing?.note ?? "",
        ...(scope === "salon" ? { membership: membershipId } : {}),
      };

      if (!body.is_day_off && !body.open_time && !body.close_time && weekly && !weekly.is_day_off) {
        body.open_time = weekly.open_time;
        body.close_time = weekly.close_time;
      }

      const res = existing
        ? await apiFetch(`${apiBase(scope)}/${existing.id}/`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await apiFetch(`${apiBase(scope)}/`, {
            method: "POST",
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        toast.error(formatApiError(errBody, "Kunni saqlab bo'lmadi."));
        return;
      }
      toast.success("Saqlandi.");
      await load();
    } finally {
      setSavingDate(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground sm:text-sm">
        Har kun uchun ish vaqtini belgilang. Ish chiqib qolsa — band soat qo&apos;shing.
      </p>

      {/* Kunlar strip — mobil uchun */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {windowDates.map((date, idx) => {
          const parts = formatDateShort(date);
          const active = expandedDate === date;
          const weekly = weeklyForDate(date, weeklyDays);
          const exception = byDate.get(date);
          const isOff = exception?.is_day_off ?? weekly?.is_day_off ?? false;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setExpandedDate(date)}
              className={cn(
                "flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-lg border px-2 py-2",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card",
              )}
            >
              <span className="text-[10px] font-medium opacity-80">+{advanceMinDays + idx}</span>
              <span className="text-lg font-bold tabular-nums">{parts.day}</span>
              <span className="text-[10px]">{isOff ? "Dam" : parts.weekday}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {windowDates.map((date, idx) => {
          const isMobileOnly = expandedDate !== date;
          return (
            <AdvanceDayRow
              key={date}
              date={date}
              offsetLabel={`+${advanceMinDays + idx} kun`}
              weekly={weeklyForDate(date, weeklyDays)}
              exception={byDate.get(date)}
              disabled={disabled || blocked || savingDate === date}
              saving={savingDate === date}
              expanded={expandedDate === date}
              onToggle={() => setExpandedDate((d) => (d === date ? date : date))}
              onSave={(patch) => void upsertDay(date, patch)}
              className={cn(isMobileOnly && "hidden md:block")}
              forceExpandedOnDesktop
            />
          );
        })}
      </div>
    </div>
  );
}

function AdvanceDayRow({
  date,
  offsetLabel,
  weekly,
  exception,
  disabled,
  saving,
  expanded,
  onToggle,
  onSave,
  className,
  forceExpandedOnDesktop,
}: {
  date: string;
  offsetLabel: string;
  weekly?: DayForm;
  exception?: ScheduleException;
  disabled?: boolean;
  saving?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSave: (patch: Partial<ScheduleException>) => void;
  className?: string;
  forceExpandedOnDesktop?: boolean;
}) {
  const parts = formatDateShort(date);
  const isDayOff = exception?.is_day_off ?? weekly?.is_day_off ?? false;
  const openTime = (exception?.open_time ?? weekly?.open_time ?? "09:00").slice(0, 5);
  const closeTime = (exception?.close_time ?? weekly?.close_time ?? "22:00").slice(0, 5);
  const [breaks, setBreaks] = useState<BreakInterval[]>(exception?.breaks ?? []);
  const [blockStart, setBlockStart] = useState("14:00");
  const [blockEnd, setBlockEnd] = useState("15:00");
  const [customOpen, setCustomOpen] = useState(openTime);
  const [customClose, setCustomClose] = useState(closeTime);

  useEffect(() => {
    setBreaks(exception?.breaks ?? []);
    setCustomOpen((exception?.open_time ?? weekly?.open_time ?? "09:00").slice(0, 5));
    setCustomClose((exception?.close_time ?? weekly?.close_time ?? "22:00").slice(0, 5));
  }, [exception, weekly]);

  const addBlock = () => {
    if (blockStart >= blockEnd) {
      toast.error("Band vaqt noto'g'ri.");
      return;
    }
    setBreaks((prev) => [...prev, { start: blockStart, end: blockEnd }]);
  };

  const summary = isDayOff
    ? "Dam olish"
    : `${customOpen} – ${customClose}${breaks.length ? ` · ${breaks.length} band` : ""}`;

  return (
    <article className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="hidden w-full items-center gap-3 px-3 py-2.5 text-left sm:px-4 md:flex"
      >
        <span className="grid size-10 shrink-0 flex-col place-items-center rounded-lg bg-muted text-center leading-tight">
          <span className="text-[9px] font-bold uppercase text-muted-foreground">{offsetLabel}</span>
          <span className="text-sm font-bold tabular-nums">{parts.day}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold capitalize">
            {parts.weekday}, {parts.month}
            {weekly ? ` · ${WEEKDAY_SHORT[weekly.weekday]}` : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">{summary}</p>
        </div>
        {saving ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        )}
      </button>

      <div
        className={cn(
          "border-t border-border md:border-t-0",
          forceExpandedOnDesktop ? (expanded ? "block" : "hidden md:block") : expanded ? "block" : "hidden",
        )}
      >
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <span className="text-sm">Butun kun dam</span>
            <Switch
              checked={isDayOff}
              disabled={disabled}
              onCheckedChange={(checked) => onSave({ is_day_off: checked, breaks: checked ? [] : breaks })}
            />
          </div>

          {!isDayOff ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Boshlanish</span>
                  <input
                    type="time"
                    value={customOpen}
                    disabled={disabled}
                    onChange={(e) => setCustomOpen(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Tugash</span>
                  <input
                    type="time"
                    value={customClose}
                    disabled={disabled}
                    onChange={(e) => setCustomClose(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </label>
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Ban className="size-3" />
                  Band soatlar
                </p>
                {breaks.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {breaks.map((br, idx) => (
                      <span
                        key={`${br.start}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                      >
                        {br.start}–{br.end}
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setBreaks((p) => p.filter((_, i) => i !== idx))}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="time"
                    value={blockStart}
                    disabled={disabled}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="h-8 w-[5.5rem] rounded-md border border-border px-1.5 text-xs"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="time"
                    value={blockEnd}
                    disabled={disabled}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="h-8 w-[5.5rem] rounded-md border border-border px-1.5 text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addBlock}>
                    <Plus className="size-3.5" />
                    Qo&apos;shish
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full rounded-lg"
                disabled={disabled}
                onClick={() =>
                  onSave({
                    is_day_off: false,
                    open_time: customOpen,
                    close_time: customClose,
                    breaks,
                  })
                }
              >
                Saqlash
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
