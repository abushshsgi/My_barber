import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, List, Navigation, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const CARD_HEIGHT = 148;
const LIST_PANEL_MAX = 420;

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
};

function SalonSlideCard({ salon, isActive }: { salon: Salon; isActive: boolean }) {
  const { t } = useTranslation();
  const coverSrc = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-2xl bg-background shadow-[0_8px_28px_rgba(0,0,0,0.16)] ring-1 transition-shadow",
        isActive ? "ring-foreground/40" : "ring-black/5",
      )}
      style={{ height: CARD_HEIGHT }}
    >
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        className="relative w-[132px] shrink-0 bg-[#E8E8E8] active:opacity-95"
      >
        <img
          src={coverSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain object-center p-0.5"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-2 text-[14px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground">
            {salon.address || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold">
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

        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-foreground py-2 text-[12px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
      </div>
    </div>
  );
}

function SalonListRow({
  salon,
  isActive,
  onSelect,
}: {
  salon: Salon;
  isActive: boolean;
  onSelect: () => void;
}) {
  const coverSrc = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "mb-1.5 flex w-full items-center gap-2.5 rounded-xl border px-2 py-2 text-left transition-colors",
        isActive ? "border-foreground/80 bg-surface" : "border-transparent active:bg-surface/80",
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#E8E8E8]">
        <img
          src={coverSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain object-center p-0.5"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[13px] font-bold leading-tight">{salon.name}</h4>
        <p className="truncate text-[10px] text-muted-foreground">{salon.address || "—"}</p>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold">
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-foreground" strokeWidth={0} />
            {salon.rating > 0 ? salon.rating.toFixed(1) : "—"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span>{formatDistanceKm(salon.distanceKm)}</span>
        </div>
      </div>
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        onClick={(e) => e.stopPropagation()}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-background active:scale-95"
      >
        <Navigation className="h-3 w-3" />
      </Link>
    </button>
  );
}

export function MapAirbnbCarousel({ salons, activeId, onActiveChange }: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    if (listOpen) return;
    const root = scrollRef.current;
    if (!root || !activeId) return;
    const el = root.querySelector(`[data-salon-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId, listOpen]);

  const syncActiveFromScroll = () => {
    const root = scrollRef.current;
    if (!root || salons.length === 0) return;
    const center = root.scrollLeft + root.clientWidth / 2;
    let closestId = salons[0].id;
    let closestDist = Infinity;
    root.querySelectorAll<HTMLElement>("[data-salon-id]").forEach((el) => {
      const id = el.dataset.salonId;
      if (!id) return;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });
    if (closestId !== activeId) onActiveChange(closestId);
  };

  const onScroll = () => {
    if (scrollRaf.current != null) return;
    scrollRaf.current = window.requestAnimationFrame(() => {
      scrollRaf.current = null;
      syncActiveFromScroll();
    });
  };

  if (salons.length === 0) return null;

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-30 overflow-hidden rounded-t-2xl border border-border/50 border-b-0 bg-background/98 shadow-[0_-12px_40px_rgba(0,0,0,0.14)] backdrop-blur-md"
      initial={false}
      animate={{ height: listOpen ? LIST_PANEL_MAX : CARD_HEIGHT + 56 }}
      transition={{ type: "spring", stiffness: 400, damping: 38 }}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border/40 px-3 py-2">
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-4 py-2 text-[11px] font-bold shadow-sm active:scale-95"
          aria-expanded={listOpen}
        >
          {listOpen ? <X className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          {t("map.allSalons")} ({salons.length})
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", listOpen && "rotate-180")}
          />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {listOpen ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="min-h-0 overflow-y-auto px-3 py-2"
            style={{ maxHeight: LIST_PANEL_MAX - 52 }}
          >
            {salons.map((s) => (
              <SalonListRow
                key={s.id}
                salon={s}
                isActive={s.id === activeId}
                onSelect={() => {
                  onActiveChange(s.id);
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-3 pb-2"
          >
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="no-scrollbar flex gap-3 snap-x snap-mandatory overflow-x-auto"
            >
              {salons.map((s) => (
                <div
                  key={s.id}
                  data-salon-id={s.id}
                  className="w-[calc(100%-2px)] shrink-0 snap-center sm:w-[94%]"
                >
                  <SalonSlideCard salon={s} isActive={s.id === activeId} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
