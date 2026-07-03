import { useMemo, useState } from "react";
import { Moon } from "lucide-react";
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

function lunchFromBreaksText(text: string): { start: string; end: string } {
  try {
    const breaks = parseBreaks(text);
    if (breaks[0]) return breaks[0];
  } catch {
    /* ignore */
  }
  return { start: "12:00", end: "13:00" };
}

function breaksTextFromLunch(start: string, end: string): string {
  if (!start || !end || start >= end) return "";
  return `${start}-${end}`;
}

export function WorkingHoursEditor({ days, onChange, disabled }: WorkingHoursEditorProps) {
  const [bulkOpen, setBulkOpen] = useState("09:00");
  const [bulkClose, setBulkClose] = useState("22:00");
  const [bulkLunchStart, setBulkLunchStart] = useState("12:00");
  const [bulkLunchEnd, setBulkLunchEnd] = useState("13:00");

  const workingCount = useMemo(() => days.filter((d) => !d.is_day_off).length, [days]);

  const applyBulkToAllWorking = () => {
    const lunch = breaksTextFromLunch(bulkLunchStart, bulkLunchEnd);
    onChange(
      days.map((d) =>
        d.is_day_off
          ? d
          : {
              ...d,
              open_time: bulkOpen,
              close_time: bulkClose,
              breaksText: lunch,
            },
      ),
    );
  };

  const setLunch = (weekday: number, start: string, end: string) => {
    onChange(updateDay(days, weekday, { breaksText: breaksTextFromLunch(start, end) }));
  };

  return (
    <div className="space-y-6">
      {/* Tez sozlash */}
      <section className="rounded-2xl border border-border bg-muted/20 p-4 lg:p-5">
        <p className="text-sm font-semibold text-foreground">Tez sozlash</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bir xil vaqtni barcha ish kunlariga bir tugma bilan qo&apos;ying.
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <TimeField label="Ochilish" value={bulkOpen} onChange={setBulkOpen} disabled={disabled} />
            <TimeField label="Yopilish" value={bulkClose} onChange={setBulkClose} disabled={disabled} />
            <TimeField
              label="Tushlik bosh"
              value={bulkLunchStart}
              onChange={setBulkLunchStart}
              disabled={disabled}
            />
            <TimeField
              label="Tushlik tugash"
              value={bulkLunchEnd}
              onChange={setBulkLunchEnd}
              disabled={disabled}
            />
          </div>
          <Button
            type="button"
            disabled={disabled}
            onClick={applyBulkToAllWorking}
            className="h-11 shrink-0 rounded-xl px-5"
          >
            Barcha ish kunlariga
          </Button>
        </div>
      </section>

      {/* Hafta jadvali */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 lg:px-5">
          <div>
            <p className="font-heading text-base font-semibold">Hafta jadvali</p>
            <p className="text-xs text-muted-foreground">
              {workingCount} kun ishlaydi · mijozlar faqat ochiq vaqtlarda bron qiladi
            </p>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-[minmax(8rem,1.2fr)_4rem_repeat(4,minmax(5.5rem,1fr))] gap-0 border-b border-border bg-muted/15 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Kun</span>
            <span className="text-center">Ish</span>
            <span>Boshlanish</span>
            <span>Tugash</span>
            <span>Tushlik</span>
            <span>Tushlik tug.</span>
          </div>
          {days.map((day) => (
            <DayTableRow
              key={day.weekday}
              day={day}
              days={days}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-border lg:hidden">
          {days.map((day) => (
            <DayMobileCard
              key={day.weekday}
              day={day}
              days={days}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tabular-nums outline-none focus:border-foreground/40 disabled:opacity-50"
      />
    </label>
  );
}

function DayTableRow({
  day,
  days,
  onChange,
  disabled,
}: {
  day: DayForm;
  days: DayForm[];
  onChange: (days: DayForm[]) => void;
  disabled?: boolean;
}) {
  const working = !day.is_day_off;
  const lunch = lunchFromBreaksText(day.breaksText);

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(8rem,1.2fr)_4rem_repeat(4,minmax(5.5rem,1fr))] items-center gap-0 border-b border-border/80 px-5 py-3 last:border-b-0",
        !working && "bg-muted/15",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold",
            working ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
          )}
        >
          {WEEKDAY_SHORT[day.weekday]}
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", !working && "text-muted-foreground")}>
            {WEEKDAYS[day.weekday]}
          </p>
          {!working ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Moon className="size-3" />
              Dam
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-center">
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

      {working ? (
        <>
          <InlineTime
            value={day.open_time}
            disabled={disabled}
            onChange={(v) => onChange(updateDay(days, day.weekday, { open_time: v }))}
          />
          <InlineTime
            value={day.close_time}
            disabled={disabled}
            onChange={(v) => onChange(updateDay(days, day.weekday, { close_time: v }))}
          />
          <InlineTime
            value={lunch.start}
            disabled={disabled}
            onChange={(v) => setLunch(days, day.weekday, v, lunch.end, onChange)}
          />
          <InlineTime
            value={lunch.end}
            disabled={disabled}
            onChange={(v) => setLunch(days, day.weekday, lunch.start, v, onChange)}
          />
        </>
      ) : (
        <div className="col-span-4 text-sm text-muted-foreground">—</div>
      )}
    </div>
  );
}

function DayMobileCard({
  day,
  days,
  onChange,
  disabled,
}: {
  day: DayForm;
  days: DayForm[];
  onChange: (days: DayForm[]) => void;
  disabled?: boolean;
}) {
  const working = !day.is_day_off;
  const lunch = lunchFromBreaksText(day.breaksText);

  return (
    <div className={cn("p-4", !working && "bg-muted/15")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-xl text-sm font-bold",
              working ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
            )}
          >
            {WEEKDAY_SHORT[day.weekday]}
          </span>
          <div>
            <p className="font-medium">{WEEKDAYS[day.weekday]}</p>
            <p className="text-xs text-muted-foreground">
              {working ? `${day.open_time} – ${day.close_time}` : "Dam olish"}
            </p>
          </div>
        </div>
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
        />
      </div>

      {working ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <TimeField
            label="Boshlanish"
            value={day.open_time}
            disabled={disabled}
            onChange={(v) => onChange(updateDay(days, day.weekday, { open_time: v }))}
          />
          <TimeField
            label="Tugash"
            value={day.close_time}
            disabled={disabled}
            onChange={(v) => onChange(updateDay(days, day.weekday, { close_time: v }))}
          />
          <TimeField
            label="Tushlik"
            value={lunch.start}
            disabled={disabled}
            onChange={(v) => setLunch(days, day.weekday, v, lunch.end, onChange)}
          />
          <TimeField
            label="Tushlik tug."
            value={lunch.end}
            disabled={disabled}
            onChange={(v) => setLunch(days, day.weekday, lunch.start, v, onChange)}
          />
        </div>
      ) : null}
    </div>
  );
}

function InlineTime({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full max-w-[8rem] rounded-lg border border-border bg-background px-2 text-sm tabular-nums outline-none focus:border-foreground/40 disabled:opacity-50"
    />
  );
}

function setLunch(
  days: DayForm[],
  weekday: number,
  start: string,
  end: string,
  onChange: (days: DayForm[]) => void,
) {
  onChange(updateDay(days, weekday, { breaksText: breaksTextFromLunch(start, end) }));
}
