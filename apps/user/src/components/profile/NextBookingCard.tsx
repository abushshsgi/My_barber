import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BookingItem } from "@/lib/mock-data";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice } from "@/lib/mock-data";

type Props = {
  booking: BookingItem | null;
};

export function NextBookingCard({ booking }: Props) {
  const { t } = useTranslation();

  if (!booking) {
    return (
      <div className="mx-5 mt-5 rounded-2xl border border-dashed border-border bg-surface/50 p-5">
        <p className="text-sm font-bold">{t("profile.nextBooking.empty")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("profile.nextBooking.emptyHint")}</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-foreground underline underline-offset-2"
        >
          {t("profile.nextBooking.browse")} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const when = formatBookingWhen(booking.date);

  return (
    <Link
      to="/bookings"
      search={{ focus: booking.id }}
      className="mx-5 mt-5 block overflow-hidden rounded-2xl bg-foreground p-5 text-background active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/60">
          {t("profile.nextBooking.title")}
        </p>
        <Calendar className="h-4 w-4 text-background/70" />
      </div>
      <h3 className="mt-2 text-lg font-bold leading-tight">{booking.salonName}</h3>
      <p className="mt-1 text-xs font-medium text-background/75">
        {booking.serviceName} · {booking.barberName}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
        <span>{when.date}</span>
        <span className="text-background/50">·</span>
        <span>{when.time}</span>
        <span className="text-background/50">·</span>
        <span>{formatPrice(booking.price)}</span>
      </div>
      <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-background/80">
        <MapPin className="h-3 w-3" /> {t("profile.nextBooking.details")}
        <ChevronRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}
