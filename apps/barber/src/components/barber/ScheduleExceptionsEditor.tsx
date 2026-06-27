import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiFetch, apiList, formatApiError } from "@/lib/api";

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

type ScheduleExceptionsEditorProps = {
  scope: "salon" | "independent";
  membershipId: number | null;
  disabled?: boolean;
};

function apiBaseFor(scope: "salon" | "independent"): string {
  return scope === "salon"
    ? "/api/v1/schedule-exceptions"
    : "/api/v1/barber/schedule-exceptions";
}

function formatDate(date: string): string {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "long",
      weekday: "short",
    });
  } catch {
    return date;
  }
}

export function ScheduleExceptionsEditor({
  scope,
  membershipId,
  disabled,
}: ScheduleExceptionsEditorProps) {
  const [items, setItems] = useState<ScheduleException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState("");
  const [isDayOff, setIsDayOff] = useState(true);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [breaks, setBreaks] = useState<BreakInterval[]>([]);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [note, setNote] = useState("");

  const blocked = scope === "salon" && !membershipId;

  const load = useCallback(async () => {
    if (blocked) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query =
        scope === "salon"
          ? `?membership=${membershipId}&upcoming=1`
          : "?upcoming=1";
      const rows = await apiList<ScheduleException>(`${apiBaseFor(scope)}/${query}`);
      setItems(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Maxsus kunlarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }, [scope, membershipId, blocked]);

  useEffect(() => {
    void load();
  }, [load]);

  const addBreakRow = () => {
    if (breakStart >= breakEnd) {
      toast.error("Tanaffus boshlanishi tugashidan oldin bo'lishi kerak.");
      return;
    }
    setBreaks((prev) => [...prev, { start: breakStart, end: breakEnd }]);
  };

  const submit = async () => {
    if (!date) {
      toast.error("Sanani tanlang.");
      return;
    }
    if (!isDayOff && openTime && closeTime && openTime >= closeTime) {
      toast.error("Yopilish vaqti ochilishdan keyin bo'lishi kerak.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        date,
        is_day_off: isDayOff,
        open_time: isDayOff ? null : openTime || null,
        close_time: isDayOff ? null : closeTime || null,
        breaks: isDayOff ? [] : breaks,
        note,
        ...(scope === "salon" ? { membership: membershipId } : {}),
      };
      const res = await apiFetch(`${apiBaseFor(scope)}/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        toast.error(formatApiError(errBody, "Maxsus kunni saqlab bo'lmadi."));
        return;
      }
      toast.success("Maxsus kun qo'shildi.");
      setNote("");
      setBreaks([]);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const res = await apiFetch(`${apiBaseFor(scope)}/${id}/`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Maxsus kunni o'chirib bo'lmadi.");
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success("Maxsus kun o'chirildi.");
  };

  const isDisabled = disabled || blocked || saving;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Sana</span>
            <input
              type="date"
              value={date}
              disabled={isDisabled}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </label>
          <div className="flex items-end justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Butun kun dam</p>
              <p className="text-xs text-muted-foreground">Shu kuni bron qabul qilinmaydi</p>
            </div>
            <Switch
              checked={isDayOff}
              disabled={isDisabled}
              onCheckedChange={setIsDayOff}
              aria-label="Butun kun dam"
            />
          </div>
        </div>

        {!isDayOff ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Ochilish (ixtiyoriy)
                </span>
                <input
                  type="time"
                  value={openTime}
                  disabled={isDisabled}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </label>
              <span className="hidden pb-3 text-muted-foreground sm:block">→</span>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Yopilish (ixtiyoriy)
                </span>
                <input
                  type="time"
                  value={closeTime}
                  disabled={isDisabled}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Soatni bo&apos;sh qoldirsangiz — haftalik jadval saqlanadi, faqat quyidagi tanaffus
              qo&apos;shiladi (masalan, ishingiz chiqib qolsa).
            </p>
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Tanaffus / band vaqt</span>
              <div className="flex flex-wrap gap-2">
                {breaks.map((br, idx) => (
                  <span
                    key={`${br.start}-${br.end}-${idx}`}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-950 dark:text-amber-100"
                  >
                    {br.start} – {br.end}
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setBreaks((prev) => prev.filter((_, i) => i !== idx))}
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
                  disabled={isDisabled}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className="h-10 w-[7.5rem] rounded-lg border border-border bg-background px-2 text-sm"
                />
                <input
                  type="time"
                  value={breakEnd}
                  disabled={isDisabled}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  className="h-10 w-[7.5rem] rounded-lg border border-border bg-background px-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDisabled}
                  className="h-10 gap-1"
                  onClick={addBreakRow}
                >
                  <Plus className="size-3.5" />
                  Qo&apos;shish
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <label className="mt-3 block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Izoh (ixtiyoriy)</span>
          <input
            type="text"
            value={note}
            disabled={isDisabled}
            placeholder="Masalan: Ta'til, shifokorga tashrif..."
            maxLength={255}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </label>

        <Button
          type="button"
          onClick={() => void submit()}
          disabled={isDisabled}
          className="mt-4 w-full rounded-lg sm:w-auto"
        >
          {saving ? "Saqlanmoqda..." : "Maxsus kunni qo'shish"}
        </Button>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Yaqinlashayotgan maxsus kunlar</span>
        {loading ? (
          <div className="flex h-20 items-center justify-center rounded-2xl border border-border bg-card">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            <CalendarOff className="size-4" />
            Hozircha maxsus kun belgilanmagan.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{formatDate(item.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.is_day_off
                      ? "Butun kun dam"
                      : item.open_time && item.close_time
                        ? `Maxsus soat ${item.open_time.slice(0, 5)}–${item.close_time.slice(0, 5)}`
                        : "Haftalik jadval + tanaffus"}
                    {item.breaks.length
                      ? ` · ${item.breaks.length} tanaffus`
                      : ""}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => void remove(item.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="O'chirish"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
