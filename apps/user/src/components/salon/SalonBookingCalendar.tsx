import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import { useAvailabilityMonth } from "@/hooks/use-bookings-api";
import { cn } from "@/lib/utils";

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SalonBookingCalendar({
  salonId,
  months = 1,
  className,
  onDateSelect,
  selectedDate,
}: {
  salonId: string;
  months?: 1 | 2;
  className?: string;
  onDateSelect?: (iso: string | null) => void;
  selectedDate?: string | null;
}) {
  const { t } = useTranslation();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [internalSelected, setInternalSelected] = useState<Date | undefined>();

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth() + 1;

  const availability = useAvailabilityMonth({
    salon: parseInt(salonId, 10),
    year,
    month,
    enabled: Boolean(salonId),
  });

  const unavailable = useMemo(() => {
    const set = new Set<string>();
    for (const day of availability.data?.days ?? []) {
      if (!day.available) set.add(day.date);
    }
    return set;
  }, [availability.data?.days]);

  const selected = selectedDate
    ? new Date(`${selectedDate}T12:00:00`)
    : internalSelected;

  const handleSelect = (date: Date | undefined) => {
    setInternalSelected(date);
    onDateSelect?.(date ? toIso(date) : null);
  };

  const disabledDays = (date: Date) => {
    const iso = toIso(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (unavailable.has(iso)) return true;
    return false;
  };

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">{t("salon.booking.selectDate")}</h2>
        {selected ? (
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className="text-sm font-bold underline underline-offset-4"
          >
            {t("salon.booking.clearDates")}
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border p-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={months}
          month={viewMonth}
          onMonthChange={setViewMonth}
          disabled={disabledDays}
          className="mx-auto"
        />
      </div>

      {selected ? (
        <Link
          to="/booking/$salonId"
          params={{ salonId }}
          search={{ date: toIso(selected) }}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground py-4 text-sm font-bold text-background"
        >
          {t("salon.bookNow")}
        </Link>
      ) : null}
    </section>
  );
}
