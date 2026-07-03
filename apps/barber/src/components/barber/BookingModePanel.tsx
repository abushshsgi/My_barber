import { CalendarClock, CalendarRange, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingMode, BookingSettings } from "@/lib/barber-schedule";

type BookingModePanelProps = {
  settings: BookingSettings;
  onChange: (next: BookingSettings) => void;
  disabled?: boolean;
  layout?: "default" | "wide";
};

const ADVANCE_PRESETS = [
  { label: "3 kun oldin", min: 3, max: 3 },
  { label: "3–5 kun", min: 3, max: 5 },
  { label: "5 kun oldin", min: 5, max: 5 },
] as const;

const MODES: {
  id: BookingMode;
  title: string;
  subtitle: string;
  detail: string;
  bullets: string[];
  icon: typeof CalendarClock;
}[] = [
  {
    id: "daily",
    title: "Har kunlik bron",
    subtitle: "Ochilish — yopilish oralig'ida",
    detail:
      "Salon ochilganidan yopilishigacha mijozlar har ish kunida bo'sh slotlarga bron qiladi. Haftalik jadval asosiy manba.",
    bullets: [
      "Masalan: 09:00 dan 22:00 gacha",
      "Tushlik va dam kunlari avtomatik yopiladi",
      "Bugun va kelgusi kunlar ochiq",
    ],
    icon: CalendarClock,
  },
  {
    id: "advance",
    title: "Oldindan bron",
    subtitle: "Faqat 3–5 kun oldin",
    detail:
      "Mijozlar bugun yoki ertaga emas — faqat siz belgilagan kunlarda va soatlarda bron qiladi. Har kun uchun soatlarni alohida sozlang.",
    bullets: [
      "Har kun uchun ish vaqti belgilanadi",
      "Band slotlarni yopish mumkin (ish chiqib qolsa)",
      "Aniq reja bilan ishlaydigan ustalar uchun",
    ],
    icon: CalendarRange,
  },
];

export function BookingModePanel({
  settings,
  onChange,
  disabled,
  layout = "default",
}: BookingModePanelProps) {
  const isAdvance = settings.booking_mode === "advance";
  const wide = layout === "wide";

  return (
    <div className={cn("space-y-6", wide && "space-y-8")}>
      <div className={cn("grid gap-4", wide ? "lg:grid-cols-2" : "sm:grid-cols-2")}>
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
                "group relative rounded-2xl border text-left transition-all",
                wide ? "min-h-[240px] p-6 lg:p-8" : "p-4 sm:p-5",
                active
                  ? "border-foreground bg-foreground text-background shadow-lg"
                  : "border-border bg-card hover:border-foreground/30 hover:shadow-md",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              {active ? (
                <span className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-background text-foreground">
                  <Check className="size-4 stroke-[2.5]" />
                </span>
              ) : null}
              <div
                className={cn(
                  "mb-4 inline-flex items-center justify-center rounded-2xl",
                  wide ? "size-14" : "size-10",
                  active ? "bg-background/15" : "bg-muted",
                )}
              >
                <Icon className={cn(wide ? "size-7" : "size-5", active ? "text-background" : "text-foreground")} />
              </div>
              <p className={cn("font-heading font-semibold", wide ? "text-2xl" : "text-base")}>
                {mode.title}
              </p>
              <p
                className={cn(
                  "mt-1 font-medium",
                  wide ? "text-sm" : "text-xs",
                  active ? "text-background/75" : "text-muted-foreground",
                )}
              >
                {mode.subtitle}
              </p>
              <p
                className={cn(
                  "mt-3 leading-relaxed",
                  wide ? "text-base" : "text-sm",
                  active ? "text-background/90" : "text-muted-foreground",
                )}
              >
                {mode.detail}
              </p>
              <ul className={cn("mt-4 space-y-1.5", wide ? "text-sm" : "text-xs")}>
                {mode.bullets.map((b) => (
                  <li
                    key={b}
                    className={cn(
                      "flex items-center gap-2",
                      active ? "text-background/80" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        active ? "bg-background" : "bg-foreground/40",
                      )}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {isAdvance ? (
        <div className={cn("rounded-2xl border border-border bg-muted/25", wide ? "p-6 lg:p-8" : "p-4 sm:p-5")}>
          <div className="mb-5 flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className={cn("font-heading font-semibold", wide ? "text-xl" : "text-base")}>
                Qancha kun oldin bron qabul qilasiz?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tez tanlov yoki qo&apos;lda oralik belgilang. Keyin «Oldindan kunlar» bo&apos;limida har kun
                uchun soatlarni sozlang.
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {ADVANCE_PRESETS.map((preset) => {
              const active =
                settings.advance_min_days === preset.min && settings.advance_max_days === preset.max;
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
                    "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:border-foreground/30",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Eng kam (kun)
              </span>
              <select
                disabled={disabled}
                value={settings.advance_min_days}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    advance_min_days: Number(e.target.value),
                    advance_max_days: Math.max(settings.advance_max_days, Number(e.target.value)),
                  })
                }
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} kun
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Eng ko&apos;p (kun)
              </span>
              <select
                disabled={disabled}
                value={settings.advance_max_days}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    advance_max_days: Math.max(settings.advance_min_days, Number(e.target.value)),
                  })
                }
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base"
              >
                {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
                  <option key={n} value={n} disabled={n < settings.advance_min_days}>
                    {n} kun
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-4 text-muted-foreground",
            wide ? "text-base" : "text-sm",
          )}
        >
          <span className="font-medium text-foreground">Har kunlik:</span> mijozlar salon ochilishidan
          yopilishigacha bo&apos;lgan bo&apos;sh vaqtlarga bron qiladi. Sozlamalar — «Haftalik jadval»
          bo&apos;limida.
        </div>
      )}
    </div>
  );
}
