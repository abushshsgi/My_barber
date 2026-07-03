import { CalendarClock, CalendarRange, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingMode, BookingSettings } from "@/lib/barber-schedule";

type BookingModePanelProps = {
  settings: BookingSettings;
  onChange: (next: BookingSettings) => void;
  disabled?: boolean;
};

const MODES: {
  id: BookingMode;
  title: string;
  subtitle: string;
  detail: string;
  icon: typeof CalendarClock;
}[] = [
  {
    id: "daily",
    title: "Har kunlik bron",
    subtitle: "Bugundan boshlab",
    detail:
      "Haftalik jadvalingiz bo'yicha mijozlar bugun va keyingi kunlarda bo'sh vaqtlarga bron qiladi. Masalan: har kuni 09:00–22:00.",
    icon: CalendarClock,
  },
  {
    id: "advance",
    title: "Oldindan bron",
    subtitle: "Faqat belgilangan kunlar oldin",
    detail:
      "Mijozlar bugun yoki ertaga emas — faqat siz belgilagan oralig'da (masalan, 2–3 kun oldin) bron qila oladi.",
    icon: CalendarRange,
  },
];

export function BookingModePanel({ settings, onChange, disabled }: BookingModePanelProps) {
  const isAdvance = settings.booking_mode === "advance";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
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
                "relative rounded-2xl border p-4 text-left transition-all sm:p-5",
                active
                  ? "border-foreground bg-foreground text-background shadow-md"
                  : "border-border bg-card hover:border-foreground/25 hover:bg-muted/30",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              {active ? (
                <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-background text-foreground">
                  <Check className="size-3.5 stroke-[2.5]" />
                </span>
              ) : null}
              <div
                className={cn(
                  "mb-3 inline-flex size-10 items-center justify-center rounded-xl",
                  active ? "bg-background/15" : "bg-muted",
                )}
              >
                <Icon className={cn("size-5", active ? "text-background" : "text-foreground")} />
              </div>
              <p className="font-heading text-base font-semibold">{mode.title}</p>
              <p className={cn("mt-0.5 text-xs font-medium", active ? "text-background/75" : "text-muted-foreground")}>
                {mode.subtitle}
              </p>
              <p className={cn("mt-2 text-sm leading-relaxed", active ? "text-background/85" : "text-muted-foreground")}>
                {mode.detail}
              </p>
            </button>
          );
        })}
      </div>

      {isAdvance ? (
        <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-foreground" />
            <div>
              <p className="font-medium text-foreground">Oldindan bron oralig'i</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Mijozlar faqat shu kunlar oralig'ida bron qila oladi. Haftalik jadval va maxsus kunlar
                shu sanalarda qo'llaniladi.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} kun oldin
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Eng ko'p (kun)
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
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
              >
                {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
                  <option key={n} value={n} disabled={n < settings.advance_min_days}>
                    {n} kun oldin
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
            Misol: {settings.advance_min_days === settings.advance_max_days
              ? `faqat ${settings.advance_min_days} kun oldin`
              : `${settings.advance_min_days}–${settings.advance_max_days} kun oldin`}{" "}
            bron mumkin. Bugun va ertaga — yo'q.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          Har kunlik rejimda mijozlar haftalik jadvalingizdagi bo'sh vaqtlarga bugundan boshlab bron
          qiladi. Dam kunlari va tushlik tanaffuslari avtomatik yopiladi.
        </div>
      )}
    </div>
  );
}
