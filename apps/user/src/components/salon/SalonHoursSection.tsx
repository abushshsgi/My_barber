import { useTranslation } from "react-i18next";
import type { SalonSectionUi } from "@/components/desktop/pages/salon-layouts/section-styles";
import type { SalonHour } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function weekdayLabel(weekday: number, t: (k: string) => string) {
  const map = [1, 2, 3, 4, 5, 6, 0];
  const idx = map.indexOf(weekday);
  return idx >= 0 ? t(`salon.hours.${WEEKDAY_KEYS[idx]}`) : String(weekday);
}

export function SalonHoursSection({
  hours,
  closedWeekdays,
  variant = "list",
  titleClassName,
}: {
  hours: SalonHour[];
  closedWeekdays: number[];
  variant?: SalonSectionUi["hours"];
  titleClassName?: string;
}) {
  const { t } = useTranslation();

  if (!hours.length && !closedWeekdays.length) return null;

  const byWeekday = new Map(hours.map((h) => [h.weekday, h]));
  const weekdays = [1, 2, 3, 4, 5, 6, 0];

  const rows = weekdays.map((weekday) => {
    const row = byWeekday.get(weekday);
    const closed = closedWeekdays.includes(weekday);
    return {
      weekday,
      label: weekdayLabel(weekday, t),
      value: closed
        ? t("salon.hours.closed")
        : row
          ? `${row.openTime} – ${row.closeTime}`
          : t("salon.hours.closed"),
      closed,
    };
  });

  return (
    <section className="space-y-4">
      <h2 className={titleClassName ?? "text-xl font-bold tracking-tight"}>
        {t("salon.hours.title")}
      </h2>

      {variant === "grid" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {rows.map((r) => (
            <div
              key={r.weekday}
              className={cn(
                "rounded-xl border border-border p-3 text-center",
                r.closed && "bg-muted/30",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {r.label.slice(0, 3)}
              </p>
              <p className={cn("mt-1 whitespace-pre-line text-xs font-semibold tabular-nums", r.closed && "text-muted-foreground")}>
                {r.closed ? "—" : r.value.replace(" – ", "\n")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {variant === "pills" ? (
        <div className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <span
              key={r.weekday}
              className={cn(
                "inline-flex flex-col rounded-full border px-4 py-2 text-xs",
                r.closed ? "border-dashed text-muted-foreground" : "border-border bg-muted/20 font-semibold",
              )}
            >
              <span className="font-bold">{r.label}</span>
              <span className="tabular-nums">{r.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {variant === "compact" ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {rows.map((r) => `${r.label}: ${r.value}`).join(" · ")}
        </p>
      ) : null}

      {variant === "list" ? (
        <div className="divide-y divide-border rounded-2xl border border-border">
          {rows.map((r) => (
            <div key={r.weekday} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{r.label}</span>
              <span className={cn("tabular-nums", r.closed ? "text-muted-foreground" : "font-bold")}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
