import { useTranslation } from "react-i18next";
import type { SalonHour } from "@/lib/mock-data";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function weekdayLabel(weekday: number, t: (k: string) => string) {
  const map = [1, 2, 3, 4, 5, 6, 0];
  const idx = map.indexOf(weekday);
  return idx >= 0 ? t(`salon.hours.${WEEKDAY_KEYS[idx]}`) : String(weekday);
}

export function SalonHoursSection({
  hours,
  closedWeekdays,
}: {
  hours: SalonHour[];
  closedWeekdays: number[];
}) {
  const { t } = useTranslation();

  if (!hours.length && !closedWeekdays.length) return null;

  const byWeekday = new Map(hours.map((h) => [h.weekday, h]));

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("salon.hours.title")}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
          const row = byWeekday.get(weekday);
          const closed = closedWeekdays.includes(weekday);
          return (
            <div key={weekday} className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="font-medium">{weekdayLabel(weekday, t)}</span>
              <span className={closed ? "text-muted-foreground" : "font-semibold tabular-nums"}>
                {closed
                  ? t("salon.hours.closed")
                  : row
                    ? `${row.openTime} – ${row.closeTime}`
                    : t("salon.hours.closed")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
