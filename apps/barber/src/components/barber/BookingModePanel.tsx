import { CalendarClock, CalendarRange, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingMode, BookingSettings } from "@/lib/barber-schedule";

type BookingModePanelProps = {
  settings: BookingSettings;
  onChange: (next: BookingSettings) => void;
  disabled?: boolean;
  layout?: "default" | "wide";
};

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
    subtitle: "Bugundan boshlab",
    detail: "Mijozlar haftalik jadvalingizdagi bo'sh vaqtlarga bugun va keyingi kunlarda bron qiladi.",
    bullets: ["Masalan: har kuni 09:00 – 22:00", "Dam kunlari va tushlik avtomatik yopiladi"],
    icon: CalendarClock,
  },
  {
    id: "advance",
    title: "Oldindan bron",
    subtitle: "Faqat oldindan",
    detail: "Mijozlar bugun yoki ertaga emas — faqat siz belgilagan kunlar oralig'ida bron qiladi.",
    bullets: ["Masalan: 2–3 kun oldin", "Aniq reja bilan ishlaydigan ustalar uchun"],
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
                wide ? "min-h-[220px] p-6 lg:p-8" : "p-4 sm:p-5",
                active
                  ? "border-foreground bg-foreground text-background shadow-lg ring-1 ring-foreground"
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
                  active ? "bg-background/15" : "bg-muted group-hover:bg-muted/80",
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
                    <span className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-background" : "bg-foreground/40")} />
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
          <div className="mb-6 flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className={cn("font-heading font-semibold", wide ? "text-xl" : "text-base")}>
                Oldindan bron oralig&apos;i
              </p>
              <p className="mt-1 text-sm text-muted-foreground lg:text-base">
                Mijozlar faqat shu kunlar oralig&apos;ida bron qila oladi.
              </p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Eng kam (kun oldin)
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
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-foreground/40"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} kun oldin
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Eng ko&apos;p (kun oldin)
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
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-foreground/40"
              >
                {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
                  <option key={n} value={n} disabled={n < settings.advance_min_days}>
                    {n} kun oldin
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-5 rounded-xl border border-border bg-background px-4 py-3 text-sm lg:text-base">
            <span className="font-medium text-foreground">Natija: </span>
            <span className="text-muted-foreground">
              {settings.advance_min_days === settings.advance_max_days
                ? `faqat ${settings.advance_min_days} kun oldin`
                : `${settings.advance_min_days}–${settings.advance_max_days} kun oldin`}{" "}
              bron mumkin. Bugun va ertaga — yo&apos;q.
            </span>
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-2xl border border-dashed border-border bg-muted/15 text-muted-foreground",
            wide ? "px-6 py-5 text-base" : "px-4 py-3 text-sm",
          )}
        >
          Har kunlik rejimda mijozlar haftalik jadvalingizdagi bo&apos;sh vaqtlarga bugundan boshlab bron
          qiladi.
        </div>
      )}
    </div>
  );
}
