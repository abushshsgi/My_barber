import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, animate, useMotionValue, type PanInfo } from "framer-motion";
import { Map as MapIcon, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const CARD_HEIGHT = 148;
const IMAGE_WIDTH = 132;
const LIST_TOP_OFFSET = 152;
const PEEK_DRAG_UP_MAX = 110;
const PEEK_DRAG_DOWN_MAX = 80;
const DRAG_UP_THRESHOLD = 56;
const DRAG_DOWN_THRESHOLD = 72;

const spring = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };
const sheetSpring = { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.92 };

const listCardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const listStaggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
};

function SalonCoverImage({
  salon,
  className,
  imgClassName,
  mode = "contain",
}: {
  salon: Salon;
  className?: string;
  imgClassName?: string;
  mode?: "contain" | "cover";
}) {
  const fallback = getSalonCoverUrl(salon.coverSeed);
  const [src, setSrc] = useState(salon.coverUrl ?? fallback);

  useEffect(() => {
    setSrc(salon.coverUrl ?? fallback);
  }, [salon.coverUrl, salon.coverSeed, fallback]);

  return (
    <div className={cn("relative overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setSrc(fallback)}
        className={cn(
          "absolute inset-0 h-full w-full",
          mode === "cover" ? "object-cover object-center" : "object-contain object-center p-1",
          imgClassName,
        )}
      />
    </div>
  );
}

function SalonSlideCard({ salon, isActive }: { salon: Salon; isActive: boolean }) {
  const { t } = useTranslation();

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
        <SalonCoverImage salon={salon} className="h-full w-full" mode="contain" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-2 text-[14px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          </Link>
          <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground">
            {salon.address || "—"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold">
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
          className="mt-1.5 flex w-full items-center justify-center rounded-xl bg-foreground py-2 text-[12px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
      </div>
    </div>
  );
}

function SalonVerticalCard({
  salon,
  isActive,
  onSelect,
}: {
  salon: Salon;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <article
      className={cn(
        "mb-4 w-full text-left",
        isActive && "rounded-2xl ring-2 ring-foreground/25 ring-offset-2 ring-offset-background",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left active:opacity-95">
        <SalonCoverImage
          salon={salon}
          mode="cover"
          className="aspect-[3/2] w-full rounded-xl"
        />
        <div className="mt-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          {salon.rating > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold">
              <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
              {salon.rating.toFixed(2)}
              {salon.reviewCount > 0 ? (
                <span className="text-muted-foreground">({salon.reviewCount})</span>
              ) : null}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
          {salon.address || "—"}
          {salon.distanceKm > 0 ? ` · ${formatDistanceKm(salon.distanceKm)}` : ""}
        </p>
        {salon.priceFrom > 0 ? (
          <p className="mt-0.5 text-[13px] font-bold">
            {shortPrice(salon.priceFrom)}
            <span className="text-[11px] font-semibold text-muted-foreground">+</span>
          </p>
        ) : null}
      </button>

      <Link
        to="/booking/$salonId"
        params={{ salonId: salon.id }}
        className="mt-2 flex w-full items-center justify-center rounded-xl bg-foreground py-2.5 text-[12px] font-bold text-background active:scale-[0.98]"
      >
        {t("map.bookNow")}
      </Link>
    </article>
  );
}

function DragHandle({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-1.5", className)}>
      <div className="h-1 w-9 rounded-full bg-border/80" />
    </div>
  );
}

export function MapAirbnbCarousel({ salons, activeId, onActiveChange }: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const peekY = useMotionValue(0);
  const peekGesture = useRef({
    active: false,
    axis: null as "x" | "y" | null,
    startX: 0,
    startY: 0,
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) return;
    const root = scrollRef.current;
    if (!root || !activeId) return;
    const el = root.querySelector(`[data-salon-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId, expanded]);

  useEffect(() => {
    if (!expanded || !activeId) return;
    const el = listScrollRef.current?.querySelector(`[data-list-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [expanded, activeId]);

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

  const resetPeekOffset = () => {
    animate(peekY, 0, sheetSpring);
  };

  const onCarouselPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    peekGesture.current = {
      active: true,
      axis: null,
      startX: e.clientX,
      startY: e.clientY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCarouselPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!peekGesture.current.active) return;

    const dx = e.clientX - peekGesture.current.startX;
    const dy = e.clientY - peekGesture.current.startY;

    if (!peekGesture.current.axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      peekGesture.current.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
    }

    if (peekGesture.current.axis === "y") {
      e.preventDefault();
      peekY.set(Math.max(-PEEK_DRAG_UP_MAX, Math.min(PEEK_DRAG_DOWN_MAX, dy)));
    }
  };

  const onCarouselPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!peekGesture.current.active) return;

    peekGesture.current.active = false;
    peekGesture.current.axis = null;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const offset = peekY.get();
    if (offset < -DRAG_UP_THRESHOLD) {
      peekY.set(0);
      setExpanded(true);
      return;
    }

    resetPeekOffset();
  };

  const onListDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DRAG_DOWN_THRESHOLD || info.velocity.y > 500) {
      setExpanded(false);
    }
  };

  if (salons.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {expanded ? (
          <motion.button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 z-30 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="list-sheet"
            className="absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-[18px] bg-background shadow-[0_-16px_48px_rgba(0,0,0,0.2)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetSpring}
            style={{
              top: `calc(env(safe-area-inset-top) + ${LIST_TOP_OFFSET}px)`,
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <motion.div
              className="shrink-0 cursor-grab active:cursor-grabbing"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 0.22 }}
              onDragEnd={onListDragEnd}
            >
              <DragHandle />
              <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 pb-2.5">
                <h2 className="text-[14px] font-bold tracking-tight">
                  {t("map.allSalons")}{" "}
                  <span className="text-muted-foreground">({salons.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                  aria-label={t("common.close")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>

            <motion.div
              ref={listScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 pb-20"
              initial="hidden"
              animate="visible"
              variants={listStaggerVariants}
            >
              {salons.map((s) => (
                <motion.div key={s.id} data-list-id={s.id} variants={listCardVariants}>
                  <SalonVerticalCard
                    salon={s}
                    isActive={s.id === activeId}
                    onSelect={() => onActiveChange(s.id)}
                  />
                </motion.div>
              ))}
            </motion.div>

            <motion.button
              type="button"
              onClick={() => setExpanded(false)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.12, ...spring }}
              className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-bold text-background shadow-[0_6px_24px_rgba(0,0,0,0.26)] active:scale-[0.97]"
              style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            >
              <MapIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("nav.map")}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="peek-sheet"
            className="absolute inset-x-0 bottom-0 z-30 px-3"
            style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div style={{ y: peekY }}>
              <div className="rounded-t-[18px] bg-background/95 pb-1 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] ring-1 ring-border/30 backdrop-blur-sm">
                <DragHandle />

                <div
                  ref={scrollRef}
                  onScroll={onScroll}
                  onPointerDown={onCarouselPointerDown}
                  onPointerMove={onCarouselPointerMove}
                  onPointerUp={onCarouselPointerUp}
                  onPointerCancel={onCarouselPointerUp}
                  className="no-scrollbar flex cursor-grab gap-2.5 snap-x snap-mandatory overflow-x-auto px-3 pb-1 active:cursor-grabbing"
                  style={{ touchAction: "pan-x" }}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
