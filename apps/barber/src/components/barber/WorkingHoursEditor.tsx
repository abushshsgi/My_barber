import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DayForm, parseBreaks, WEEKDAY_SHORT, WEEKDAYS } from "@/lib/barber-schedule";

type WorkingHoursEditorProps = {
  days: DayForm[];
  onChange: (days: DayForm[]) => void;
  disabled?: boolean;
};

const OPEN_CHIPS = ["08:00", "09:00", "10:00", "11:00", "12:00"] as const;
const CLOSE_CHIPS = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] as const;
const LUNCH_START_CHIPS = ["12:00", "12:30", "13:00"] as const;
const LUNCH_END_CHIPS = ["13:00", "13:30", "14:00"] as const;
const HOURS = Array.from({ length: 25 }, (_, i) => i);

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

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function firstWorkingWeekday(days: DayForm[]): number {
  return days.find((d) => !d.is_day_off)?.weekday ?? 0;
}

export function WorkingHoursEditor({ days, onChange, disabled }: WorkingHoursEditorProps) {
  const workingCount = useMemo(() => days.filter((d) => !d.is_day_off).length, [days]);
  const [selectedWeekday, setSelectedWeekday] = useState(() => firstWorkingWeekday(days));

  const selected = days.find((d) => d.weekday === selectedWeekday) ?? days[0];
  const selectedWorking = !selected.is_day_off;
  const selectedLunch = lunchFromBreaksText(selected.breaksText);

  const update = (weekday: number, patch: Partial<DayForm>) => {
    if (disabled) return;
    onChange(updateDay(days, weekday, patch));
  };

  const setLunch = (weekday: number, start: string, end: string) => {
    update(weekday, { breaksText: breaksTextFromLunch(start, end) });
  };

  const applyAllWorking = (patch: Partial<DayForm>) => {
    if (disabled) return;
    onChange(days.map((d) => (d.is_day_off ? d : { ...d, ...patch })));
  };

  const PRESETS = [
    {
      key: "weekdays",
      label: "Du – Ju",
      sub: "9:00 – 20:00",
      apply: () =>
        onChange(
          days.map((d) => ({
            ...d,
            is_day_off: d.weekday >= 5,
            open_time: "09:00",
            close_time: "20:00",
            breaksText: d.weekday >= 5 ? "" : "12:00-13:00",
          })),
        ),
    },
    {
      key: "everyday",
      label: "Har kuni",
      sub: "10:00 – 22:00",
      apply: () =>
        onChange(
          days.map((d) => ({
            ...d,
            is_day_off: false,
            open_time: "10:00",
            close_time: "22:00",
            breaksText: "12:00-13:00",
          })),
        ),
    },
    {
      key: "longweek",
      label: "Du – Sha",
      sub: "10:00 – 21:00",
      apply: () =>
        onChange(
          days.map((d) => ({
            ...d,
            is_day_off: d.weekday === 6,
            open_time: "10:00",
            close_time: "21:00",
            breaksText: d.weekday === 6 ? "" : "12:00-13:00",
          })),
        ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Summary */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <motion.span
              key={workingCount}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl"
            >
              {workingCount}
            </motion.span>
            <span className="text-sm font-semibold text-muted-foreground">/ 7 kun</span>
          </div>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            {workingCount === 0
              ? "Ish kuni tanlanmagan"
              : workingCount === 7
                ? "Dam olish kunisiz"
                : `${7 - workingCount} kun dam olasiz`}
          </p>
        </div>
        {workingCount > 0 && !disabled ? (
          <button
            type="button"
            onClick={() =>
              onChange(
                days.map((d) => ({
                  ...d,
                  is_day_off: true,
                  breaksText: "",
                })),
              )
            }
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Tozalash
          </button>
        ) : null}
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {PRESETS.map((p) => (
          <motion.button
            key={p.key}
            type="button"
            disabled={disabled}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
            onClick={p.apply}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-foreground hover:bg-muted/40 disabled:opacity-50 sm:gap-2 sm:px-3.5 sm:py-2"
          >
            <span className="text-[11px] font-bold leading-none text-foreground sm:text-xs">
              {p.label}
            </span>
            <span className="text-[9.5px] font-medium leading-none text-muted-foreground tabular-nums sm:text-[10px]">
              {p.sub}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Day pills */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((d) => {
          const isSelected = d.weekday === selectedWeekday;
          const working = !d.is_day_off;
          return (
            <motion.button
              key={d.weekday}
              type="button"
              disabled={disabled}
              whileTap={{ scale: disabled ? 1 : 0.94 }}
              onClick={() => setSelectedWeekday(d.weekday)}
              className="group relative flex flex-col items-center gap-1 rounded-2xl px-0.5 py-2 transition-colors disabled:opacity-50 sm:px-1"
            >
              {isSelected ? (
                <motion.span
                  layoutId="schedule-day-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-2xl bg-muted/70"
                />
              ) : null}
              <span
                className={cn(
                  "relative text-[10px] font-bold uppercase tracking-wider sm:text-[11px]",
                  isSelected
                    ? "text-foreground"
                    : working
                      ? "text-foreground/70"
                      : "text-muted-foreground/50",
                )}
              >
                {WEEKDAY_SHORT[d.weekday]}
              </span>
              <span
                className={cn(
                  "relative h-1.5 w-1.5 rounded-full",
                  working ? "bg-foreground" : "bg-muted-foreground/25",
                )}
              />
              {working ? (
                <span className="relative hidden text-[8px] font-medium tabular-nums text-muted-foreground sm:block">
                  {d.open_time.slice(0, 5)}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      {/* Selected day card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected.weekday}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tanlangan kun
              </p>
              <p className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                {WEEKDAYS[selected.weekday]}
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                update(selected.weekday, {
                  is_day_off: selectedWorking,
                  breaksText: selectedWorking ? "" : selected.breaksText || "12:00-13:00",
                })
              }
              className={cn(
                "relative inline-flex h-9 shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-50",
                selectedWorking ? "bg-foreground" : "bg-muted",
              )}
              style={{ width: 92 }}
              aria-label={`${WEEKDAYS[selected.weekday]} ish kuni`}
            >
              <span
                className={cn(
                  "absolute inset-y-0 flex items-center px-3 text-[10px] font-bold uppercase tracking-wider transition-opacity",
                  selectedWorking ? "right-3 text-background opacity-100" : "right-3 opacity-0",
                )}
              >
                Ochiq
              </span>
              <span
                className={cn(
                  "absolute inset-y-0 flex items-center px-3 text-[10px] font-bold uppercase tracking-wider transition-opacity",
                  !selectedWorking
                    ? "left-3 text-muted-foreground opacity-100"
                    : "left-3 opacity-0",
                )}
              >
                Yopiq
              </span>
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className={cn(
                  "relative h-7 w-7 rounded-full bg-background shadow-[var(--shadow-soft)]",
                  selectedWorking ? "ml-[58px]" : "ml-0",
                )}
              />
            </button>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {selectedWorking ? (
              <motion.div
                key="open"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="overflow-hidden"
              >
                <div className="space-y-5 border-t border-border/60 px-4 py-4 sm:px-5 sm:py-5">
                  {/* Work hours */}
                  <div>
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Ish vaqti
                    </p>
                    <div className="mb-4 flex items-stretch justify-center gap-2 sm:gap-4">
                      <TimePicker
                        label="Ochilish"
                        value={selected.open_time}
                        disabled={disabled}
                        onChange={(v) => update(selected.weekday, { open_time: v })}
                      />
                      <div className="flex items-center text-xl font-light text-muted-foreground sm:text-2xl">
                        —
                      </div>
                      <TimePicker
                        label="Yopilish"
                        value={selected.close_time}
                        disabled={disabled}
                        onChange={(v) => update(selected.weekday, { close_time: v })}
                      />
                    </div>

                    <HourRail
                      open={selected.open_time}
                      close={selected.close_time}
                      lunchStart={selectedLunch.start}
                      lunchEnd={selectedLunch.end}
                    />

                    <TimeChipRow
                      label="Ochilish vaqti"
                      options={OPEN_CHIPS}
                      value={selected.open_time}
                      disabled={disabled}
                      onSelect={(v) => update(selected.weekday, { open_time: v })}
                    />
                    <div className="mt-2.5">
                      <TimeChipRow
                        label="Yopilish vaqti"
                        options={CLOSE_CHIPS}
                        value={selected.close_time}
                        disabled={disabled}
                        onSelect={(v) => update(selected.weekday, { close_time: v })}
                      />
                    </div>
                  </div>

                  {/* Lunch break */}
                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-3.5 sm:p-4">
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Tushlik tanaffusi
                    </p>
                    <div className="mb-3 flex items-stretch justify-center gap-2 sm:gap-4">
                      <TimePicker
                        label="Boshlanish"
                        value={selectedLunch.start}
                        disabled={disabled}
                        compact
                        onChange={(v) => setLunch(selected.weekday, v, selectedLunch.end)}
                      />
                      <div className="flex items-center text-lg font-light text-muted-foreground">
                        —
                      </div>
                      <TimePicker
                        label="Tugash"
                        value={selectedLunch.end}
                        disabled={disabled}
                        compact
                        onChange={(v) => setLunch(selected.weekday, selectedLunch.start, v)}
                      />
                    </div>
                    <TimeChipRow
                      label="Boshlanish"
                      options={LUNCH_START_CHIPS}
                      value={selectedLunch.start}
                      disabled={disabled}
                      onSelect={(v) => setLunch(selected.weekday, v, selectedLunch.end)}
                    />
                    <div className="mt-2">
                      <TimeChipRow
                        label="Tugash"
                        options={LUNCH_END_CHIPS}
                        value={selectedLunch.end}
                        disabled={disabled}
                        onSelect={(v) => setLunch(selected.weekday, selectedLunch.start, v)}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => update(selected.weekday, { breaksText: "" })}
                      className="mt-3 text-[10px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                    >
                      Tanaffussiz ishlash
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      applyAllWorking({
                        open_time: selected.open_time,
                        close_time: selected.close_time,
                        breaksText: selected.breaksText,
                      })
                    }
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-dashed border-border bg-transparent px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-50 sm:text-xs"
                  >
                    Bu vaqtni barcha ish kunlariga qo&apos;llash
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="closed"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/60 px-5 py-10 text-center">
                  <Moon className="mx-auto mb-2 size-5 text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">Dam olish kuni</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Yuqoridagi tugmani bosib ochsangiz bo&apos;ladi
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Week overview */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-xs font-semibold text-foreground">Hafta ko&apos;rinishi</p>
        </div>
        <div className="divide-y divide-border/60">
          {days.map((d) => {
            const working = !d.is_day_off;
            const lunch = lunchFromBreaksText(d.breaksText);
            return (
              <button
                key={d.weekday}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedWeekday(d.weekday)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30 disabled:opacity-50",
                  d.weekday === selectedWeekday && "bg-muted/20",
                  !working && "opacity-70",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold",
                    working ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  {WEEKDAY_SHORT[d.weekday]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {working ? (
                    <>
                      <span className="font-medium tabular-nums">
                        {d.open_time} – {d.close_time}
                      </span>
                      {d.breaksText ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          · tushlik {lunch.start}–{lunch.end}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Dam olish</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function HourRail({
  open,
  close,
  lunchStart,
  lunchEnd,
}: {
  open: string;
  close: string;
  lunchStart: string;
  lunchEnd: string;
}) {
  const dayMinutes = 24 * 60;
  const openMin = toMinutes(open);
  const closeMin = toMinutes(close);
  const lunchStartMin = lunchStart ? toMinutes(lunchStart) : 0;
  const lunchEndMin = lunchEnd ? toMinutes(lunchEnd) : 0;
  const hasLunch =
    lunchStart &&
    lunchEnd &&
    lunchStart < lunchEnd &&
    lunchStartMin >= openMin &&
    lunchEndMin <= closeMin;

  return (
    <div className="mb-4 px-0.5">
      <div className="relative h-10 rounded-xl bg-muted/40">
        <div className="absolute inset-x-0 inset-y-0 flex justify-between px-1">
          {HOURS.map((h) => (
            <div key={h} className="flex flex-col items-center justify-center">
              <span
                className={cn(
                  "h-1.5 w-px",
                  h % 6 === 0 ? "bg-muted-foreground/50" : "bg-muted-foreground/20",
                )}
              />
            </div>
          ))}
        </div>
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="absolute inset-y-1.5 rounded-lg bg-foreground/90"
          style={{
            left: `${(openMin / dayMinutes) * 100}%`,
            width: `${Math.max(2, ((closeMin - openMin) / dayMinutes) * 100)}%`,
          }}
        />
        {hasLunch ? (
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="absolute inset-y-1.5 rounded-md border border-background/40 bg-background/90"
            style={{
              left: `${(lunchStartMin / dayMinutes) * 100}%`,
              width: `${Math.max(1.5, ((lunchEndMin - lunchStartMin) / dayMinutes) * 100)}%`,
            }}
          />
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between px-0.5 text-[9px] font-medium text-muted-foreground tabular-nums">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

function TimeChipRow<T extends string>({
  label,
  options,
  value,
  onSelect,
  disabled,
}: {
  label: string;
  options: readonly T[];
  value: string;
  onSelect: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((t) => {
          const active = value === t;
          return (
            <motion.button
              key={t}
              type="button"
              disabled={disabled}
              whileTap={{ scale: disabled ? 1 : 0.93 }}
              onClick={() => onSelect(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-bold tabular-nums transition-colors disabled:opacity-50",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/50",
              )}
            >
              {t}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function TimePicker({
  label,
  value,
  onChange,
  disabled,
  compact,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
      (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } else {
      el.focus();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={openPicker}
      className={cn(
        "group relative flex flex-1 flex-col items-center rounded-2xl border border-border bg-background transition-colors hover:border-foreground disabled:opacity-50",
        compact ? "px-2 py-2 sm:px-3 sm:py-2.5" : "px-2 py-2.5 sm:px-4 sm:py-4",
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={cn(
          "mt-0.5 font-bold tabular-nums tracking-tight text-foreground",
          compact ? "text-lg sm:text-xl" : "text-xl sm:text-[28px]",
        )}
      >
        {value}
      </motion.span>
      <input
        ref={ref}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </button>
  );
}
