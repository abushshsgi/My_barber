import { useMemo, useState } from "react";
import { Copy, Moon, Zap } from "lucide-react";
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
          : { ...d, open_time: bulkOpen, close_time: bulkClose, breaksText: lunch },
      ),
    );
  };

  const copyMondayToAll = () => {
    const mon = days.find((d) => d.weekday === 0 && !d.is_day_off);
    if (!mon) return;
    onChange(
      days.map((d) =>
        d.is_day_off
          ? d
          : {
              ...d,
              open_time: mon.open_time,
              close_time: mon.close_time,
              breaksText: mon.breaksText,
            },
      ),
    );
  };

  return (
    <div className="space-y-4">
      {/* Tez sozlash — ixcham */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Zap className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Tez sozlash</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TimeField label="Ochilish" value={bulkOpen} onChange={setBulkOpen} disabled={disabled} />
            <TimeField label="Yopilish" value={bulkClose} onChange={setBulkClose} disabled={disabled} />
            <TimeField
              label="Tushlik"
              value={bulkLunchStart}
              onChange={setBulkLunchStart}
              disabled={disabled}
            />
            <TimeField
              label="Tushlik tug."
              value={bulkLunchEnd}
              onChange={setBulkLunchEnd}
              disabled={disabled}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={applyBulkToAllWorking}
              className="h-9 rounded-lg"
            >
              <Copy className="size-3.5" />
              Barcha ish kunlariga
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={copyMondayToAll}
              className="h-9 rounded-lg"
            >
              Dushanbadan nusxa
            </Button>
          </div>
        </div>
      </section>

      {/* Hafta jadvali */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div>
            <p className="text-sm font-semibold">Hafta jadvali</p>
            <p className="text-xs text-muted-foreground">{workingCount} kun ishlaydi</p>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_3rem_repeat(4,minmax(0,1fr))] gap-2 border-b border-border bg-muted/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Kun</span>
            <span className="text-center">Ish</span>
            <span>Boshlanish</span>
            <span>Tugash</span>
            <span>Tushlik</span>
            <span>Tugash</span>
          </div>
          {days.map((day) => (
            <DayTableRow key={day.weekday} day={day} days={days} onChange={onChange} disabled={disabled} />
          ))}
        </div>

        {/* Mobile */}
        <div className="divide-y divide-border md:hidden">
          {days.map((day) => (
            <DayMobileCard key={day.weekday} day={day} days={days} onChange={onChange} disabled={disabled} />
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
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm tabular-nums outline-none focus:border-foreground/40 disabled:opacity-50"
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
        "grid grid-cols-[1fr_3rem_repeat(4,minmax(0,1fr))] items-center gap-2 border-b border-border/60 px-4 py-2 last:border-b-0",
        !working && "bg-muted/15",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-bold",
            working ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
          )}
        >
          {WEEKDAY_SHORT[day.weekday]}
        </span>
        <span className={cn("truncate text-sm", !working && "text-muted-foreground")}>
          {WEEKDAYS[day.weekday]}
          {!working ? (
            <Moon className="ml-1 inline size-3 text-muted-foreground" />
          ) : null}
        </span>
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
        <div className="col-span-4 text-xs text-muted-foreground">Dam</div>
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
    <div className={cn("p-3", !working && "bg-muted/15")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg text-xs font-bold",
              working ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
            )}
          >
            {WEEKDAY_SHORT[day.weekday]}
          </span>
          <div>
            <p className="text-sm font-medium">{WEEKDAYS[day.weekday]}</p>
            <p className="text-[11px] text-muted-foreground">
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
        <div className="mt-2 grid grid-cols-2 gap-2">
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
            label="Tugash"
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
      className="h-8 w-full rounded-md border border-border bg-background px-1.5 text-xs tabular-nums outline-none focus:border-foreground/40 disabled:opacity-50"
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
