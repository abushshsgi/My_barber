import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { List, Navigation, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const CARD_HEIGHT = 172;
const IMAGE_WIDTH = 158;
const LIST_PANEL_MAX = 480;

const spring = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
};

function SalonCoverThumb({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain object-center p-1"
      />
    </div>
  );
}

function SalonSlideCard({ salon, isActive }: { salon: Salon; isActive: boolean }) {
  const { t } = useTranslation();
  const coverSrc = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-2xl bg-background shadow-[0_10px_32px_rgba(0,0,0,0.18)] ring-1 transition-shadow",
        isActive ? "ring-foreground/45" : "ring-black/5",
      )}
      style={{ height: CARD_HEIGHT }}
    >
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        className="active:opacity-95"
        style={{ width: IMAGE_WIDTH }}
      >
        <SalonCoverThumb src={coverSrc} className="h-full w-full rounded-none" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-3">
        <div className="min-w-0 flex-1">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-muted-foreground">
            {salon.address || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-semibold">
            {salon.rating > 0 ? (
              <span className="flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
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
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-foreground py-2.5 text-[13px] font-bold text-background active:scale-[0.98]"
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
  index,
}: {
  salon: Salon;
  isActive: boolean;
  onSelect: () => void;
  index: number;
}) {
  const coverSrc = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.28, ease: "easeOut" }}
      onClick={onSelect}
      className={cn(
        "mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
        isActive ? "border-foreground/80 bg-surface shadow-sm" : "border-border/40 bg-background active:bg-surface/80",
      )}
    >
      <SalonCoverThumb src={coverSrc} className="h-[88px] w-[88px] rounded-xl" />
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-[15px] font-bold leading-snug">{salon.name}</h4>
        <p className="mt-1 line-clamp-2 text-[12px] font-medium text-muted-foreground">{salon.address || "—"}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12px] font-semibold">
          <span className="flex items-center gap-0.5">
            <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
            {salon.rating > 0 ? salon.rating.toFixed(1) : "—"}
          </span>
          <span className="text-muted-foreground">{formatDistanceKm(salon.distanceKm)}</span>
          {salon.priceFrom > 0 ? <span>{shortPrice(salon.priceFrom)}+</span> : null}
        </div>
      </div>
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        onClick={(e) => e.stopPropagation()}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-background active:scale-95"
      >
        <Navigation className="h-4 w-4" />
      </Link>
    </motion.button>
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
    <>
      <AnimatePresence>
        {listOpen ? (
          <>
            <motion.button
              type="button"
              aria-label={t("common.close")}
              className="absolute inset-0 z-30 bg-black/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListOpen(false)}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-2xl border border-border/60 border-b-0 bg-background shadow-[0_-16px_48px_rgba(0,0,0,0.2)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={spring}
              style={{
                maxHeight: LIST_PANEL_MAX,
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
                <h2 className="text-sm font-bold">
                  {t("map.allSalons")}{" "}
                  <span className="text-muted-foreground">({salons.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setListOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-surface active:scale-95"
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {salons.map((s, i) => (
                  <SalonListRow
                    key={s.id}
                    salon={s}
                    isActive={s.id === activeId}
                    index={i}
                    onSelect={() => onActiveChange(s.id)}
                  />
                ))}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {!listOpen ? (
        <div
          className="absolute inset-x-0 bottom-0 z-30 px-3"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          <div className="mb-2 flex justify-center">
            <motion.button
              type="button"
              onClick={() => setListOpen(true)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2.5 text-[12px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.14)] active:opacity-90"
            >
              <List className="h-4 w-4" />
              {t("map.allSalons")} ({salons.length})
            </motion.button>
          </div>

          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="no-scrollbar flex gap-3 snap-x snap-mandatory overflow-x-auto pb-1"
          >
            {salons.map((s) => (
              <motion.div
                key={s.id}
                data-salon-id={s.id}
                className="w-[calc(100%-2px)] shrink-0 snap-center sm:w-[94%]"
                layout
              >
                <SalonSlideCard salon={s} isActive={s.id === activeId} />
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
