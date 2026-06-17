import { Link } from "@tanstack/react-router";
import { motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

type Props = {
  salon: Salon;
  onPrev: () => void;
  onNext: () => void;
  onSwipe: (dir: 1 | -1) => void;
  canPrev: boolean;
  canNext: boolean;
};

export function MapSalonCard({ salon, onPrev, onNext, onSwipe, canPrev, canNext }: Props) {
  const { t } = useTranslation();
  const coverSrc = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);

  const onPanEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50 || info.velocity.x < -400) onSwipe(1);
    else if (info.offset.x > 50 || info.velocity.x > 400) onSwipe(-1);
  };

  return (
    <motion.div
      className="rounded-2xl border border-border/60 bg-background/98 p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur-md"
      onPanEnd={onPanEnd}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-surface">
        <img
          src={coverSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {salon.rating > 0 ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[11px] font-bold">
            <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
            {salon.rating.toFixed(1)}
            {salon.reviewCount > 0 ? (
              <span className="text-muted-foreground">
                · {salon.reviewCount} {t("map.reviews")}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="truncate text-base font-bold text-white drop-shadow-sm">{salon.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-white/90">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{salon.address || "—"}</span>
            <span>·</span>
            <span className="shrink-0">{formatDistanceKm(salon.distanceKm)}</span>
          </p>
        </div>
        {canPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-md active:scale-95"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        {canNext ? (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow-md active:scale-95"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {salon.priceFrom > 0 ? (
        <p className="mt-2 text-right text-sm font-bold">
          {shortPrice(salon.priceFrom)}
          <span className="text-[10px] font-bold text-muted-foreground">+</span>
        </p>
      ) : null}

      <div className="mt-2 flex gap-2">
        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="flex flex-1 items-center justify-center rounded-xl bg-foreground py-3 text-xs font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
        <Link
          to="/salon/$id"
          params={{ id: salon.id }}
          className={cn(
            "flex flex-1 items-center justify-center rounded-xl border-2 border-foreground py-3 text-xs font-bold active:scale-[0.98]",
          )}
        >
          {t("map.viewSalon")}
        </Link>
      </div>
    </motion.div>
  );
}
