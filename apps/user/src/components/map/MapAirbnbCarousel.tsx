import { Link } from "@tanstack/react-router";
import { motion, animate, useMotionValue, useMotionValueEvent, useTransform, type PanInfo } from "framer-motion";
import { Map as MapIcon, Search, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const CARD_HEIGHT = 132;
const IMAGE_WIDTH = 120;
const PEEK_SHEET_HEIGHT = 168;
const LIST_REVEAL_RATIO = 0.38;
const SNAP_OPEN_RATIO = 0.55;
const VELOCITY_OPEN = -280;
const VELOCITY_CLOSE = 200;
const EXPANDED_TOP_GAP = 8;

const sheetSpring = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.9 };

function getExpandedSheetHeight(containerHeight: number) {
  return Math.max(PEEK_SHEET_HEIGHT + 80, containerHeight - EXPANDED_TOP_GAP);
}

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
  onAllSalonsOpenChange?: (open: boolean) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
};

function SalonCoverImage({
  salon,
  className,
  imgClassName,
  mode = "contain",
  eager = false,
}: {
  salon: Salon;
  className?: string;
  imgClassName?: string;
  mode?: "contain" | "cover";
  eager?: boolean;
}) {
  const fallback = getSalonCoverUrl(salon.coverSeed);
  const primary = salon.coverUrl?.trim() || fallback;
  const [src, setSrc] = useState(primary);
  const errorStepRef = useRef(0);

  useEffect(() => {
    errorStepRef.current = 0;
    setSrc(salon.coverUrl?.trim() || fallback);
  }, [salon.coverUrl, salon.coverSeed, fallback]);

  const handleError = () => {
    errorStepRef.current += 1;
    if (errorStepRef.current === 1) {
      setSrc(fallback);
      return;
    }
    if (errorStepRef.current === 2) {
      setSrc(getSalonCoverUrl(`${salon.coverSeed}-fallback`));
    }
  };

  return (
    <div className={cn("overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleError}
        className={cn(
          "block h-full w-full",
          mode === "cover" ? "object-cover object-center" : "object-contain object-center p-1",
          imgClassName,
        )}
      />
    </div>
  );
}

function SalonPeekCard({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  const distance = formatDistanceKm(salon.distanceKm);
  const hasMeta = salon.rating > 0 || distance !== "—" || salon.priceFrom > 0;

  return (
    <div
      className="flex overflow-hidden rounded-2xl bg-background shadow-[0_10px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
      style={{ height: CARD_HEIGHT }}
    >
      <div className="h-full shrink-0 overflow-hidden" style={{ width: IMAGE_WIDTH }}>
        <Link
          to="/salon/$id"
          params={{ id: salon.id }}
          className="block h-full w-full active:opacity-95"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <SalonCoverImage salon={salon} className="h-full w-full" mode="cover" eager />
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <Link
            to="/salon/$id"
            params={{ id: salon.id }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <h3 className="line-clamp-2 text-[14px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          </Link>
          {salon.address ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground">
              {salon.address}
            </p>
          ) : null}
          {hasMeta ? (
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
              {distance !== "—" ? (
                <span className="text-muted-foreground">{distance}</span>
              ) : null}
              {salon.priceFrom > 0 ? <span>{shortPrice(salon.priceFrom)}+</span> : null}
            </div>
          ) : null}
        </div>

        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="mt-1.5 flex w-full items-center justify-center rounded-xl bg-foreground py-2 text-[12px] font-bold text-background active:scale-[0.98]"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {t("map.bookNow")}
        </Link>
      </div>
    </div>
  );
}

function getSalonGalleryUrls(salon: Salon, count = 6): string[] {
  const urls: string[] = [];
  if (salon.portfolio.length > 0) {
    urls.push(...salon.portfolio.slice(0, count));
  }
  const cover = salon.coverUrl?.trim() || getSalonCoverUrl(salon.coverSeed);
  for (let i = urls.length; i < count; i += 1) {
    urls.push(i === 0 ? cover : getSalonCoverUrl(`${salon.coverSeed}-${i}`));
  }
  return urls.slice(0, count);
}

function SalonThumbGrid({ salon }: { salon: Salon }) {
  const thumbs = getSalonGalleryUrls(salon);

  return (
    <div className="flex flex-wrap gap-1.5">
      {thumbs.map((url, index) => (
        <div
          key={`${salon.id}-${index}`}
          className="h-[72px] w-[calc((100%-12px)/3)] overflow-hidden rounded-xl bg-[#E8E8E8] shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
        >
          <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="block h-full w-full object-cover object-center"
          />
        </div>
      ))}
    </div>
  );
}

function SalonSearchSlideCard({
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
    <article className="w-full">
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left active:opacity-95"
        aria-pressed={isActive}
      >
        <div
          className={cn(
            "overflow-hidden rounded-2xl bg-[#E8E8E8] shadow-[0_8px_28px_rgba(0,0,0,0.16)]",
            isActive && "ring-2 ring-foreground/25 ring-offset-2 ring-offset-background",
          )}
        >
          <SalonCoverImage salon={salon} mode="cover" className="aspect-[5/3] w-full" />
        </div>

        <div className="mt-3 px-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight text-foreground">
              {salon.name}
            </h3>
            {salon.rating > 0 ? (
              <span className="flex shrink-0 items-center gap-1 text-[14px] font-medium leading-none">
                <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
                {salon.rating.toFixed(2).replace(".", ",")}
              </span>
            ) : null}
          </div>

          {salon.address ? (
            <p className="mt-1 line-clamp-1 text-[14px] text-muted-foreground">{salon.address}</p>
          ) : null}

          {distance !== "—" ? (
            <p className="mt-0.5 line-clamp-1 text-[14px] text-muted-foreground">{distance}</p>
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

function SalonSearchCarousel({
  salons,
  activeId,
  onActiveChange,
}: {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !activeId) return;
    const el = root.querySelector(`[data-search-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId, salons]);

  const syncActiveFromScroll = () => {
    const root = scrollRef.current;
    if (!root || salons.length === 0) return;
    const center = root.scrollLeft + root.clientWidth / 2;
    let closestId = salons[0].id;
    let closestDist = Infinity;
    root.querySelectorAll<HTMLElement>("[data-search-id]").forEach((el) => {
      const id = el.dataset.searchId;
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

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 touch-pan-x"
    >
      {salons.map((salon) => (
        <div
          key={salon.id}
          data-search-id={salon.id}
          className="w-[calc(100%-8px)] shrink-0 snap-center sm:w-[94%]"
        >
          <SalonSearchSlideCard
            salon={salon}
            isActive={salon.id === activeId}
            onSelect={() => onActiveChange(salon.id)}
          />
        </div>
      ))}
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
            isActive && "rounded-2xl ring-2 ring-foreground/25 ring-offset-2 ring-offset-background",
          )}
        >
          <SalonThumbGrid salon={salon} />
        </div>

        <div className="mt-3 px-1">
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

          {salon.address ? (
            <p className="mt-1 line-clamp-1 text-[14px] text-muted-foreground">
              {salon.address}
            </p>
          ) : null}

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
    <div className={cn("flex justify-center py-1.5", className)}>
      <div className="h-1 w-8 rounded-full bg-border/80" />
    </div>
  );
}

export function MapAirbnbCarousel({
  salons,
  activeId,
  onActiveChange,
  onAllSalonsOpenChange,
  query = "",
  onQueryChange,
}: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(false);
  const panStartHeightRef = useRef(PEEK_SHEET_HEIGHT);
  const listDragActiveRef = useRef(false);
  const listDragStartYRef = useRef(0);

  const sheetHeight = useMotionValue(PEEK_SHEET_HEIGHT);
  const [expandedHeight, setExpandedHeight] = useState(() =>
    typeof window !== "undefined" ? getExpandedSheetHeight(window.innerHeight - 68) : 420,
  );
  const [expanded, setExpanded] = useState(false);
  const [listRevealed, setListRevealed] = useState(false);

  const travel = expandedHeight - PEEK_SHEET_HEIGHT;
  const listRevealHeight = PEEK_SHEET_HEIGHT + travel * LIST_REVEAL_RATIO;

  useMotionValueEvent(sheetHeight, "change", (height) => {
    setListRevealed(height >= listRevealHeight);
  });

  useEffect(() => {
    onAllSalonsOpenChange?.(expanded || listRevealed);
  }, [expanded, listRevealed, onAllSalonsOpenChange]);

  const backdropOpacity = useTransform(sheetHeight, (height) => {
    const progress = (height - PEEK_SHEET_HEIGHT) / travel;
    if (progress <= 0.04) return 0;
    if (progress < LIST_REVEAL_RATIO) return progress * 0.12;
    return 0.1 + (progress - LIST_REVEAL_RATIO) * 0.55;
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
    if (!expanded || !activeId) return;
    const el = listScrollRef.current?.querySelector(`[data-list-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [expanded, activeId]);

  const snapSheet = (open: boolean) => {
    expandedRef.current = open;
    setExpanded(open);
    animate(sheetHeight, open ? expandedHeight : PEEK_SHEET_HEIGHT, sheetSpring);
  };

  const applyDragOffset = (offsetY: number) => {
    const next = panStartHeightRef.current - offsetY;
    sheetHeight.set(Math.max(PEEK_SHEET_HEIGHT, Math.min(expandedHeight, next)));
  };

  const onSheetPanStart = () => {
    panStartHeightRef.current = sheetHeight.get();
  };

  const onSheetPan = (_: unknown, info: PanInfo) => {
    applyDragOffset(info.offset.y);
  };

  const finishSheetDrag = (offsetY: number, velocityY: number) => {
    const progress = (sheetHeight.get() - PEEK_SHEET_HEIGHT) / travel;

    if (expandedRef.current) {
      if (velocityY > VELOCITY_CLOSE || offsetY > travel * SNAP_OPEN_RATIO) {
        snapSheet(false);
      } else {
        snapSheet(true);
      }
      return;
    }

    if (velocityY < VELOCITY_OPEN || progress >= SNAP_OPEN_RATIO) {
      snapSheet(true);
    } else {
      snapSheet(false);
    }
  };

  const onSheetPanEnd = (_: unknown, info: PanInfo) => {
    finishSheetDrag(info.offset.y, info.velocity.y);
  };

  const onListPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!listRevealed) return;
    const el = listScrollRef.current;
    if (!el || el.scrollTop > 1) return;
    listDragActiveRef.current = true;
    listDragStartYRef.current = e.clientY;
    panStartHeightRef.current = sheetHeight.get();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onListPointerMoveCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!listDragActiveRef.current) return;
    const dy = e.clientY - listDragStartYRef.current;
    if (dy > 0) {
      e.preventDefault();
      applyDragOffset(dy);
      return;
    }
    if (dy < -10) {
      listDragActiveRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onListPointerUpCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!listDragActiveRef.current) return;
    listDragActiveRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    finishSheetDrag(e.clientY - listDragStartYRef.current, 0);
  };

  if (salons.length === 0) return null;

  const activeSalon = salons.find((s) => s.id === activeId) ?? salons[0];
  const isSearching = query.trim().length > 0;

  return (
    <>
      <motion.div
        className={cn(
          "pointer-events-none absolute inset-0 z-20",
          listRevealed ? "bg-black" : "bg-black/80",
        )}
        style={{ opacity: backdropOpacity }}
      />

      {listRevealed ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[25] bg-background/20 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        />
      ) : null}

      <motion.div
        ref={sheetRef}
        style={{
          height: sheetHeight,
          paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        }}
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[22px] shadow-[0_-16px_48px_rgba(0,0,0,0.22)]",
          listRevealed ? "bg-background" : "bg-background/98 ring-1 ring-border/20",
        )}
      >
        {!listRevealed ? (
          <motion.div
            onPanStart={onSheetPanStart}
            onPan={onSheetPan}
            onPanEnd={onSheetPanEnd}
            className="shrink-0 cursor-grab touch-none px-3 pb-2 active:cursor-grabbing"
          >
            <DragHandle />
            <SalonPeekCard salon={activeSalon} />
          </motion.div>
        ) : null}

        {listRevealed ? (
          <motion.div
            onPanStart={onSheetPanStart}
            onPan={onSheetPan}
            onPanEnd={onSheetPanEnd}
            className="shrink-0 cursor-grab touch-none border-b border-border/40 active:cursor-grabbing"
          >
            <div className="relative px-4 pb-3 pt-2">
              <div className="pointer-events-none flex justify-center pb-2">
                <div className="h-1 w-9 rounded-full bg-border/80" />
              </div>
              {expanded ? (
                <button
                  type="button"
                  onClick={() => snapSheet(false)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="absolute right-4 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                  aria-label={t("common.close")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <div
                className="relative rounded-full border border-border/50 bg-surface py-2.5 pl-10 pr-4 touch-auto"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={2.4}
                />
                <input
                  value={query}
                  onChange={(e) => onQueryChange?.(e.target.value)}
                  placeholder={t("map.search") as string}
                  className="w-full bg-transparent text-[13px] font-semibold placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
          </motion.div>
        ) : null}

        {listRevealed ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              ref={listScrollRef}
              onPointerDownCapture={isSearching ? undefined : onListPointerDownCapture}
              onPointerMoveCapture={isSearching ? undefined : onListPointerMoveCapture}
              onPointerUpCapture={isSearching ? undefined : onListPointerUpCapture}
              onPointerCancelCapture={isSearching ? undefined : onListPointerUpCapture}
              className={cn(
                "h-full overscroll-contain px-4 py-3 pb-20",
                isSearching ? "overflow-hidden touch-pan-x" : "overflow-y-auto touch-pan-y",
              )}
            >
              {isSearching ? (
                <SalonSearchCarousel
                  salons={salons}
                  activeId={activeId}
                  onActiveChange={onActiveChange}
                />
              ) : (
                salons.map((s) => (
                  <div key={s.id} data-list-id={s.id}>
                    <SalonListCard
                      salon={s}
                      isActive={s.id === activeId}
                      onSelect={() => onActiveChange(s.id)}
                    />
                  </div>
                ))
              )}
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
