import { Link } from "@tanstack/react-router";
import { motion, animate, useMotionValue, useMotionValueEvent, useTransform, type PanInfo } from "framer-motion";
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
const PEEK_SHEET_HEIGHT = 196;
const LIST_REVEAL_OFFSET = 28;
const SNAP_OPEN_RATIO = 0.5;
const SNAP_EARLY_OPEN_RATIO = 0.22;
const VELOCITY_OPEN = -220;
const VELOCITY_CLOSE = 180;
const EXPANDED_TOP_GAP = 8;

const sheetSpring = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.9 };

function getExpandedSheetHeight(containerHeight: number) {
  return Math.max(PEEK_SHEET_HEIGHT + 80, containerHeight - EXPANDED_TOP_GAP);
}

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

function SalonListCard({
  salon,
  isActive,
  onSelect,
}: {
  salon: Salon;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const distance = formatDistanceKm(salon.distanceKm);

  return (
    <article className="mb-6 w-full text-left last:mb-4">
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left active:opacity-95"
        aria-pressed={isActive}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-[#E8E8E8] shadow-[0_2px_16px_rgba(0,0,0,0.1)]",
            isActive && "ring-2 ring-foreground/25 ring-offset-2 ring-offset-background",
          )}
        >
          <SalonCoverImage salon={salon} mode="cover" className="aspect-[4/3] w-full" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
          >
            <span className="h-[6px] w-[6px] rounded-full bg-white shadow-sm" />
            <span className="h-[6px] w-[6px] rounded-full bg-white/50 shadow-sm" />
            <span className="h-[6px] w-[6px] rounded-full bg-white/50 shadow-sm" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight text-foreground">
              {salon.name}
            </h3>
            {salon.rating > 0 ? (
              <span className="flex shrink-0 items-center gap-1 text-[14px] font-medium leading-none">
                <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
                {salon.rating.toFixed(2).replace(".", ",")}
                {salon.reviewCount > 0 ? (
                  <span className="text-muted-foreground">({salon.reviewCount})</span>
                ) : null}
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-1 text-[14px] text-muted-foreground">
            {salon.address || "—"}
          </p>

          {distance !== "—" ? (
            <p className="mt-0.5 line-clamp-1 text-[14px] text-muted-foreground">{distance}</p>
          ) : null}

          {salon.priceFrom > 0 ? (
            <p className="mt-2 text-[15px] leading-snug">
              <span className="font-semibold underline decoration-foreground/40 underline-offset-2">
                {shortPrice(salon.priceFrom)}
              </span>
              <span className="text-muted-foreground"> {t("map.priceFromSuffix")}</span>
            </p>
          ) : null}
        </div>
      </button>

      <Link
        to="/booking/$salonId"
        params={{ salonId: salon.id }}
        className="mt-3 flex w-full items-center justify-center rounded-xl bg-foreground py-3 text-[14px] font-semibold text-background shadow-sm active:scale-[0.98]"
      >
        {t("map.bookNow")}
      </Link>
    </article>
  );
}

function DragHandle({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-1", className)}>
      <div className="h-1 w-8 rounded-full bg-border/80" />
    </div>
  );
}

export function MapAirbnbCarousel({ salons, activeId, onActiveChange }: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const expandedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const sheetHeight = useMotionValue(PEEK_SHEET_HEIGHT);
  const [expandedHeight, setExpandedHeight] = useState(() =>
    typeof window !== "undefined" ? getExpandedSheetHeight(window.innerHeight - 68) : 420,
  );
  const [expanded, setExpanded] = useState(false);
  const [listRevealed, setListRevealed] = useState(false);

  useMotionValueEvent(sheetHeight, "change", (height) => {
    setListRevealed(height > PEEK_SHEET_HEIGHT + LIST_REVEAL_OFFSET);
  });

  const backdropOpacity = useTransform(
    sheetHeight,
    [PEEK_SHEET_HEIGHT, expandedHeight],
    [0, 0.22],
  );

  const peekGesture = useRef({
    active: false,
    axis: null as "x" | "y" | null,
    startX: 0,
    startY: 0,
    scrollStart: 0,
    moved: false,
  });

  useEffect(() => {
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;

    const measure = () => setExpandedHeight(getExpandedSheetHeight(parent.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) {
      const root = scrollRef.current;
      if (!root || !activeId) return;
      const el = root.querySelector(`[data-salon-id="${activeId}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeId, expanded]);

  useEffect(() => {
    if (!expanded || !activeId) return;
    const el = listScrollRef.current?.querySelector(`[data-list-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [expanded, activeId]);

  const travel = expandedHeight - PEEK_SHEET_HEIGHT;

  const snapSheet = (open: boolean) => {
    expandedRef.current = open;
    setExpanded(open);
    animate(sheetHeight, open ? expandedHeight : PEEK_SHEET_HEIGHT, sheetSpring);
  };

  const setSheetHeightFromDrag = (offsetY: number, opening: boolean) => {
    if (opening) {
      const lift = Math.max(0, -offsetY);
      sheetHeight.set(PEEK_SHEET_HEIGHT + Math.min(travel, lift));
      return;
    }
    const closeDrag = Math.max(0, offsetY);
    sheetHeight.set(Math.max(PEEK_SHEET_HEIGHT, expandedHeight - closeDrag));
  };

  const onSheetPan = (_: unknown, info: PanInfo) => {
    if (expandedRef.current) {
      setSheetHeightFromDrag(info.offset.y, false);
      return;
    }
    if (info.offset.y > 0) {
      setSheetHeightFromDrag(info.offset.y, false);
      return;
    }
    setSheetHeightFromDrag(info.offset.y, true);
    if (info.offset.y < -travel * SNAP_EARLY_OPEN_RATIO) {
      snapSheet(true);
    }
  };

  const onSheetPanEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.y;
    const velocityY = info.velocity.y;

    if (expandedRef.current) {
      if (velocityY > VELOCITY_CLOSE || offset > travel * SNAP_OPEN_RATIO) {
        snapSheet(false);
      } else {
        snapSheet(true);
      }
      return;
    }

    if (velocityY < VELOCITY_OPEN || offset < -travel * SNAP_OPEN_RATIO) {
      snapSheet(true);
    } else {
      snapSheet(false);
    }
  };

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

  const onCarouselPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    peekGesture.current = {
      active: true,
      axis: null,
      startX: e.clientX,
      startY: e.clientY,
      scrollStart: scrollRef.current?.scrollLeft ?? 0,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCarouselPointerMoveCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!peekGesture.current.active) return;

    const dx = e.clientX - peekGesture.current.startX;
    const dy = e.clientY - peekGesture.current.startY;

    if (!peekGesture.current.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      peekGesture.current.axis = Math.abs(dy) > Math.abs(dx) * 1.15 ? "y" : "x";
    }

    if (!peekGesture.current.axis) return;

    peekGesture.current.moved = true;
    e.preventDefault();

    if (peekGesture.current.axis === "y") {
      if (expandedRef.current) {
        setSheetHeightFromDrag(dy, false);
        return;
      }
      setSheetHeightFromDrag(dy, true);
      if (-dy > travel * SNAP_EARLY_OPEN_RATIO) {
        snapSheet(true);
      }
      return;
    }

    const root = scrollRef.current;
    if (root) root.scrollLeft = peekGesture.current.scrollStart - dx;
  };

  const onCarouselPointerUpCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!peekGesture.current.active) return;

    const { moved, axis: endedAxis } = peekGesture.current;
    const dy = e.clientY - peekGesture.current.startY;
    peekGesture.current.active = false;
    peekGesture.current.axis = null;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (moved && endedAxis === "x") syncActiveFromScroll();

    if (moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 320);
    }

    if (!moved || endedAxis !== "y") return;

    const currentHeight = sheetHeight.get();
    const progress = (currentHeight - PEEK_SHEET_HEIGHT) / travel;

    if (expandedRef.current) {
      if (progress < SNAP_OPEN_RATIO || dy > travel * SNAP_OPEN_RATIO) {
        snapSheet(false);
      } else {
        snapSheet(true);
      }
      return;
    }

    if (progress > SNAP_OPEN_RATIO || -dy > travel * SNAP_OPEN_RATIO) {
      snapSheet(true);
    } else {
      snapSheet(false);
    }
  };

  const onCarouselClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (salons.length === 0) return null;

  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 bg-black"
        style={{ opacity: backdropOpacity }}
      />

      <motion.div
        ref={sheetRef}
        style={{
          height: sheetHeight,
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[22px] bg-background shadow-[0_-16px_48px_rgba(0,0,0,0.22)]"
      >
        <motion.div
          onPan={expanded || listRevealed ? onSheetPan : undefined}
          onPanEnd={expanded || listRevealed ? onSheetPanEnd : undefined}
          className={cn(
            "shrink-0",
            (expanded || listRevealed) && "cursor-grab touch-none border-b border-border/40 active:cursor-grabbing",
          )}
        >
          {(expanded || listRevealed) ? (
            <div className="relative flex items-center justify-between gap-2 px-4 pb-2.5 pt-2">
              <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                <div className="h-1 w-9 rounded-full bg-border/80" />
              </div>
              <h2 className="text-[15px] font-bold tracking-tight">
                {t("map.allSalons")}{" "}
                <span className="text-muted-foreground">({salons.length})</span>
              </h2>
              {expanded ? (
                <button
                  type="button"
                  onClick={() => snapSheet(false)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                  aria-label={t("common.close")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="h-8 w-8" />
              )}
            </div>
          ) : null}
        </motion.div>

        {listRevealed ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              ref={listScrollRef}
              className="h-full overflow-y-auto overscroll-contain px-4 py-3 pb-20"
            >
              {salons.map((s) => (
                <div key={s.id} data-list-id={s.id}>
                  <SalonListCard
                    salon={s}
                    isActive={s.id === activeId}
                    onSelect={() => onActiveChange(s.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!expanded ? (
          <div
            className="shrink-0 touch-none select-none px-3 pb-1"
            onPointerDownCapture={onCarouselPointerDownCapture}
            onPointerMoveCapture={onCarouselPointerMoveCapture}
            onPointerUpCapture={onCarouselPointerUpCapture}
            onPointerCancelCapture={onCarouselPointerUpCapture}
            onClickCapture={onCarouselClickCapture}
          >
            <DragHandle />

            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="no-scrollbar flex cursor-grab gap-2.5 snap-x snap-mandatory overflow-x-auto pb-1 active:cursor-grabbing"
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
        ) : null}

        {expanded ? (
          <motion.button
            type="button"
            onClick={() => snapSheet(false)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-[12px] font-bold text-background shadow-[0_4px_20px_rgba(0,0,0,0.24)] active:scale-[0.97]"
            style={{ marginBottom: "max(8px, env(safe-area-inset-bottom))" }}
          >
            <MapIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("nav.map")}
          </motion.button>
        ) : null}
      </motion.div>
    </>
  );
}
