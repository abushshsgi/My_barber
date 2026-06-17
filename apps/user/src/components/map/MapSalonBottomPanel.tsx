import { Link } from "@tanstack/react-router";
import { motion, type PanInfo } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const PEEK_HEIGHT = 64;
const EXPANDED_HEIGHT = 232;

type Props = {
  salon: Salon;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSwipe: (dir: 1 | -1) => void;
  canPrev: boolean;
  canNext: boolean;
  onListOpen: () => void;
};

export function MapSalonBottomPanel({
  salon,
  index,
  total,
  expanded,
  onToggle,
  onPrev,
  onNext,
  onSwipe,
  canPrev,
  canNext,
  onListOpen,
}: Props) {
  const { t } = useTranslation();
  const coverSrc = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);

  const onPanEnd = (_: unknown, info: PanInfo) => {
    if (expanded) {
      if (info.offset.y > 50 || info.velocity.y > 400) onToggle();
      return;
    }
    if (info.offset.x < -50 || info.velocity.x < -400) onSwipe(1);
    else if (info.offset.x > 50 || info.velocity.x > 400) onSwipe(-1);
  };

  return (
    <motion.div
      className="z-30 shrink-0 overflow-hidden rounded-t-2xl border border-border/60 border-b-0 bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
      initial={false}
      animate={{ height: expanded ? EXPANDED_HEIGHT : PEEK_HEIGHT }}
      transition={{ type: "spring", stiffness: 400, damping: 38, mass: 0.9 }}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <motion.div
        className="touch-pan-y"
        onPanEnd={onPanEnd}
        onClick={!expanded ? onToggle : undefined}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full flex-col items-center pt-2 pb-1 active:opacity-80"
          aria-expanded={expanded}
          aria-label={expanded ? t("map.collapseCard") : t("map.expandCard")}
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
          <ChevronUp
            className={cn(
              "mt-1 h-3.5 w-3.5 text-muted-foreground transition-transform duration-300",
              expanded && "rotate-180",
            )}
          />
        </button>

        {!expanded ? (
          <div className="flex items-center gap-2.5 px-3 pb-2">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
              <img
                src={coverSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold">{salon.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                {salon.rating > 0 ? (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-foreground" strokeWidth={0} />
                    {salon.rating.toFixed(1)}
                  </span>
                ) : null}
                <span>{formatDistanceKm(salon.distanceKm)}</span>
                {total > 1 ? <span>· {index + 1}/{total}</span> : null}
              </p>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        ) : null}
      </motion.div>

      <motion.div
        className="px-3"
        initial={false}
        animate={{ opacity: expanded ? 1 : 0, y: expanded ? 0 : 12 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ pointerEvents: expanded ? "auto" : "none" }}
      >
        <button
          type="button"
          onClick={onListOpen}
          className="mb-2 flex w-full items-center justify-center gap-1 rounded-full bg-surface py-1.5 text-[10px] font-bold active:scale-[0.98]"
        >
          {t("map.allSalons")} ({total})
          <ChevronDown className="h-3 w-3" />
        </button>

        <div className="flex gap-3">
          <Link
            to="/salon/$id"
            params={{ id: salon.id }}
            className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface active:scale-[0.98]"
          >
            <img
              src={coverSrc}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link to="/salon/$id" params={{ id: salon.id }} className="min-w-0">
                <h3 className="truncate text-[15px] font-bold leading-tight">{salon.name}</h3>
              </Link>
              {total > 1 ? (
                <div className="flex shrink-0 gap-0.5">
                  {canPrev ? (
                    <button
                      type="button"
                      onClick={onPrev}
                      className="grid h-6 w-6 place-items-center rounded-full bg-surface active:scale-95"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {canNext ? (
                    <button
                      type="button"
                      onClick={onNext}
                      className="grid h-6 w-6 place-items-center rounded-full bg-surface active:scale-95"
                      aria-label="Next"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
              {salon.address || "—"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold">
              {salon.rating > 0 ? (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                  {salon.rating.toFixed(1)}
                  {salon.reviewCount > 0 ? (
                    <span className="text-muted-foreground">({salon.reviewCount})</span>
                  ) : null}
                </span>
              ) : null}
              <span className="text-muted-foreground">{formatDistanceKm(salon.distanceKm)}</span>
              {salon.priceFrom > 0 ? <span>{shortPrice(salon.priceFrom)}+</span> : null}
            </div>
          </div>
        </div>

        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-foreground py-2.5 text-[13px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
      </motion.div>
    </motion.div>
  );
}

export const MAP_PANEL_PEEK = PEEK_HEIGHT;
export const MAP_PANEL_EXPANDED = EXPANDED_HEIGHT;
