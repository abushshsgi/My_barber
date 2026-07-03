import { CalendarClock, CalendarRange, Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingMode, BookingSettings } from "@/lib/barber-schedule";

type BookingModePanelProps = {
  settings: BookingSettings;
  onChange: (next: BookingSettings) => void;
  disabled?: boolean;
};

const ADVANCE_PRESETS = [
  { label: "3 kun", hint: "Faqat 3-kun", min: 3, max: 3 },
  { label: "3–5 kun", hint: "Moslashuvchan", min: 3, max: 5 },
  { label: "5 kun", hint: "Faqat 5-kun", min: 5, max: 5 },
] as const;

const MODES: {
  id: BookingMode;
  title: string;
  short: string;
  icon: typeof CalendarClock;
}[] = [
  {
    id: "daily",
    title: "Har kunlik",
    short: "Ochilish — yopilish oralig'ida bron",
    icon: CalendarClock,
  },
  {
    id: "advance",
    title: "Oldindan",
    short: "Faqat belgilangan kun va soatlarda",
    icon: CalendarRange,
  },
];

function clampDays(n: number) {
  return Math.min(14, Math.max(1, n));
}

export function BookingModePanel({ settings, onChange, disabled }: BookingModePanelProps) {
  const isAdvance = settings.booking_mode === "advance";

  const setMin = (min: number) => {
    const next = clampDays(min);
    onChange({
      ...settings,
      advance_min_days: next,
      advance_max_days: Math.max(settings.advance_max_days, next),
    });
  };

  const setMax = (max: number) => {
    const next = clampDays(max);
    onChange({
      ...settings,
      advance_max_days: Math.max(settings.advance_min_days, next),
    });
  };

  const previewDays = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Rejim tanlash */}
      <div className="grid gap-2 sm:grid-cols-2">
        {MODES.map((mode) => {
          const active = settings.booking_mode === mode.id;
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...settings, booking_mode: mode.id })}
              className={cn(
                "relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-foreground bg-foreground text-background shadow-md"
                  : "border-border bg-card hover:border-foreground/25",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              {active ? (
                <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-background text-foreground">
                  <Check className="size-3.5 stroke-[2.5]" />
                </span>
              ) : null}
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg",
                  active ? "bg-background/15" : "bg-muted",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 pr-6">
                <span className="block font-heading text-base font-semibold">{mode.title}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs leading-snug",
                    active ? "text-background/75" : "text-muted-foreground",
                  )}
                >
                  {mode.short}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {isAdvance ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <p className="font-heading text-sm font-semibold">Qancha kun oldin?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Keyin «Oldindan kunlar» bo&apos;limida har kun uchun soat belgilang
            </p>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {/* Presetlar */}
            <div className="grid grid-cols-3 gap-2">
              {ADVANCE_PRESETS.map((preset) => {
                const active =
                  settings.advance_min_days === preset.min &&
                  settings.advance_max_days === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...settings,
                        advance_min_days: preset.min,
                        advance_max_days: preset.max,
                      })
                    }
                    className={cn(
                      "rounded-lg border px-2 py-2.5 text-center transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted/30 hover:border-foreground/30",
                    )}
                  >
                    <span className="block text-sm font-bold">{preset.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px]",
                        active ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {preset.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Qo'lda sozlash */}
            <div className="grid gap-3 sm:grid-cols-2">
              <DayStepper
                label="Eng kam"
                value={settings.advance_min_days}
                disabled={disabled}
                onChange={setMin}
              />
              <DayStepper
                label="Eng ko'p"
                value={settings.advance_max_days}
                disabled={disabled}
                min={settings.advance_min_days}
                onChange={setMax}
              />
            </div>

            {/* Vizual ko'rinish */}
            <div className="rounded-lg bg-muted/40 px-3 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Mijoz qachon bron qila oladi?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {previewDays.map((d) => {
                  const allowed =
                    d >= settings.advance_min_days && d <= settings.advance_max_days;
                  return (
                    <span
                      key={d}
                      className={cn(
                        "inline-flex min-w-[3.25rem] flex-col items-center rounded-md border px-2 py-1.5 text-center",
                        allowed
                          ? "border-foreground/30 bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground line-through opacity-50",
                      )}
                    >
                      <span className="text-[10px] font-medium opacity-80">
                        {d === 1 ? "Bugun" : d === 2 ? "Ertaga" : `+${d}`}
                      </span>
                      <span className="text-xs font-bold tabular-nums">{d} kun</span>
                    </span>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Natija:{" "}
                <span className="font-medium text-foreground">
                  {settings.advance_min_days === settings.advance_max_days
                    ? `${settings.advance_min_days} kun oldin`
                    : `${settings.advance_min_days}–${settings.advance_max_days} kun oldin`}
                </span>
                . Bugun va ertaga — yo&apos;q.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Har kunlik:</span> mijozlar ish vaqtingiz
          bo&apos;yicha bo&apos;sh slotlarga bron qiladi. «Haftalik jadval» bo&apos;limida sozlang.
        </div>
      )}
    </div>
  );
}

function DayStepper({
  label,
  value,
  onChange,
  disabled,
  min = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          className="grid size-8 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-[2.5rem] text-center text-lg font-bold tabular-nums">{value}</span>
        <button
          type="button"
          disabled={disabled || value >= 14}
          onClick={() => onChange(value + 1)}
          className="grid size-8 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
        <span className="text-xs text-muted-foreground">kun</span>
      </div>
    </div>
  );
}
