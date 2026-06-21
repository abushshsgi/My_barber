import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Share2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { SalonPageSections } from "@/components/salon/SalonPageSections";
import { SalonBookingCalendar } from "@/components/salon/SalonBookingCalendar";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import { cn } from "@/lib/utils";

export function SalonDesktopPage({
  salon,
  fav,
  onToggleFav,
}: {
  salon: Salon;
  fav: boolean;
  onToggleFav: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="relative aspect-[21/9] overflow-hidden rounded-2xl">
        <img
          src={salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{salon.category}</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">{salon.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm font-bold">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-white" />
              {salon.rating} ({salon.reviewCount})
            </span>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {salon.distanceKm} km
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleFav}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground"
            >
              <Heart className={cn("h-4 w-4", fav && "fill-foreground")} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_360px] items-start gap-8">
        <SalonPageSections salon={salon} calendarMonths={2} />

        <aside className="sticky top-24 space-y-5 rounded-2xl border border-border bg-surface/30 p-5">
          <DesktopPageHeader title={t("salon.bookNow")} />
          <p className="text-2xl font-bold tabular-nums">{formatPrice(salon.priceFrom)}+</p>
          <p className="flex items-start gap-2 text-sm font-medium">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{salon.address}</span>
          </p>
          <SalonBookingCalendar salonId={salon.id} months={1} className="!space-y-3" />
          <Link
            to="/booking/$salonId"
            params={{ salonId: salon.id }}
            className="flex w-full items-center justify-center rounded-2xl bg-foreground py-4 text-sm font-bold text-background"
          >
            {t("salon.bookNow")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
