import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiFetch, apiList, formatApiError } from "@/lib/api";
import type { DayForm } from "@/lib/barber-schedule";
import { WEEKDAYS } from "@/lib/barber-schedule";
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

function formatDateLabel(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("uz-UZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
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
  const blocked = scope === "salon" && !membershipId;

  const windowDates = useMemo(() => {
    const out: string[] = [];
    for (let d = advanceMinDays; d <= advanceMaxDays; d++) {
      out.push(dateKeyOffset(d));
    }
    return out;
  }, [advanceMinDays, advanceMaxDays]);

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
      toast.success("Kun yangilandi.");
      await load();
    } finally {
      setSavingDate(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mijozlar faqat quyidagi kunlarda bron qiladi. Har kun uchun ish soatini belgilang yoki
        band slotlarni yoping (masalan, ishingiz chiqib qolsa).
      </p>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {windowDates.map((date) => (
          <AdvanceDayCard
            key={date}
            date={date}
            weekly={weeklyForDate(date, weeklyDays)}
            exception={byDate.get(date)}
            disabled={disabled || blocked || savingDate === date}
            saving={savingDate === date}
            onSave={(patch) => void upsertDay(date, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function AdvanceDayCard({
  date,
  weekly,
  exception,
  disabled,
  saving,
  onSave,
}: {
  date: string;
  weekly?: DayForm;
  exception?: ScheduleException;
  disabled?: boolean;
  saving?: boolean;
  onSave: (patch: Partial<ScheduleException>) => void;
}) {
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

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        isDayOff ? "border-border bg-muted/20" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-base font-semibold capitalize">{formatDateLabel(date)}</p>
          <p className="text-xs text-muted-foreground">
            {weekly ? WEEKDAYS[weekly.weekday] : ""} · oldindan bron kuni
          </p>
        </div>
        {saving ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2">
        <span className="text-sm font-medium">Butun kun dam</span>
        <Switch
          checked={isDayOff}
          disabled={disabled}
          onCheckedChange={(checked) => onSave({ is_day_off: checked, breaks: checked ? [] : breaks })}
        />
      </div>

      {!isDayOff ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Boshlanish
              </span>
              <input
                type="time"
                value={customOpen}
                disabled={disabled}
                onChange={(e) => setCustomOpen(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Tugash
              </span>
              <input
                type="time"
                value={customClose}
                disabled={disabled}
                onChange={(e) => setCustomClose(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Ban className="size-3.5" />
              Band slotlar (bron yo&apos;q)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {breaks.map((br, idx) => (
                <span
                  key={`${br.start}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-xs font-medium"
                >
                  {br.start}–{br.end}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setBreaks((p) => p.filter((_, i) => i !== idx))}
                    className="rounded p-0.5 hover:bg-destructive/20"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="time"
                value={blockStart}
                disabled={disabled}
                onChange={(e) => setBlockStart(e.target.value)}
                className="h-9 w-[6.5rem] rounded-lg border border-border px-2 text-xs"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="time"
                value={blockEnd}
                disabled={disabled}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="h-9 w-[6.5rem] rounded-lg border border-border px-2 text-xs"
              />
              <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addBlock}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>

          <Button
            type="button"
            className="mt-4 w-full rounded-xl"
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
            Kunni saqlash
          </Button>
        </>
      ) : null}
    </article>
  );
}
