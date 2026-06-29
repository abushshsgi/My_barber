import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { SalonBookingCalendar } from "@/components/salon/SalonBookingCalendar";
import { resolveDefaultServiceIdsForBarber } from "@/lib/salon-services";
import { cn } from "@/lib/utils";

export function SalonBookingAside({
  salon,
  className,
  compact = false,
}: {
  salon: Salon;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const calendarBarberId =
    salon.staff.find((s) => s.isBookable !== false)?.id ?? salon.staff[0]?.id;
  const calendarServiceIds = resolveDefaultServiceIdsForBarber(
    salon.services,
    calendarBarberId,
  );

  return (
    <aside
      className={cn(
        "rounded-2xl border border-border bg-background p-6 shadow-[0_8px_28px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("salon.bookNow")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("salon.bookingHint", { defaultValue: "Xizmat va vaqtni tanlang" })}
          </p>
        </div>
        {salon.rating > 0 ? (
          <span className="rounded-lg bg-muted px-2.5 py-1 text-sm font-bold tabular-nums">
            ★ {salon.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{salon.address}</span>
      </p>

      {!compact ? (
        <SalonBookingCalendar
          salonId={salon.id}
          barberId={calendarBarberId}
          serviceIds={calendarServiceIds.length ? calendarServiceIds : undefined}
          months={1}
          className="mt-5 !space-y-3 [&_h2]:text-base"
        />
      ) : null}

      <Link
        to="/booking/$salonId"
        params={{ salonId: salon.id }}
        className="mt-5 flex w-full items-center justify-center rounded-xl bg-foreground py-3.5 text-sm font-bold text-background transition-opacity hover:opacity-90"
      >
        {t("salon.bookNow")}
      </Link>
    </aside>
  );
}
