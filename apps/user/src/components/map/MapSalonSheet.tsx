import { Link } from "@tanstack/react-router";
import { motion, animate, useMotionValue, type PanInfo } from "framer-motion";
import { Search, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const GRID_COUNT = 6;
const PEEK_HEIGHT = 112;
const SNAP_EXPAND_RATIO = 0.45;
const VELOCITY_EXPAND = -320;
const VELOCITY_COLLAPSE = 280;
const sheetSpring = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.92 };

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
};

function SalonCoverImage({ salon, className }: { salon: Salon; className?: string }) {
  const fallback = getSalonCoverUrl(salon.coverSeed);
  const src = salon.coverUrl?.trim() || fallback;

  return (
    <div className={cn("overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== fallback) img.src = fallback;
        }}
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

function SalonGridCell({
  salon,
  isActive,
  onSelect,
}: {
  salon: Salon;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={salon.name}
      className={cn(
        "min-w-0 flex-1 overflow-hidden rounded-xl bg-[#E8E8E8] ring-1 ring-black/5 active:scale-[0.98]",
        isActive && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
      )}
    >
      <SalonCoverImage salon={salon} className="h-[72px] w-full" />
    </button>
  );
}

function SalonGridRow({
  items,
  activeId,
  onActiveChange,
}: {
  items: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
}) {
  const slots = Array.from({ length: 3 }, (_, i) => items[i] ?? null);

  return (
    <div className="flex gap-2">
      {slots.map((salon, i) =>
        salon ? (
          <SalonGridCell
            key={salon.id}
            salon={salon}
            isActive={salon.id === activeId}
            onSelect={() => onActiveChange(salon.id)}
          />
        ) : (
          <div key={`empty-${i}`} className="min-w-0 flex-1" aria-hidden />
        ),
      )}
    </div>
  );
}

function SalonPeekCard({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  const distance = formatDistanceKm(salon.distanceKm);

  return (
    <div
      className="flex shrink-0 overflow-hidden rounded-2xl bg-background shadow-[0_6px_24px_rgba(0,0,0,0.1)] ring-1 ring-black/5"
      style={{ height: PEEK_HEIGHT }}
    >
      <div className="h-full w-[108px] shrink-0 overflow-hidden">
        <Link to="/salon/$id" params={{ id: salon.id }} className="block h-full w-full">
          <SalonCoverImage salon={salon} className="h-full w-full" />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2">
        <div className="min-w-0">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-1 text-[14px] font-bold tracking-tight">{salon.name}</h3>
          </Link>
          {salon.address ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{salon.address}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold">
            {salon.rating > 0 ? (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                {salon.rating.toFixed(1)}
              </span>
            ) : null}
            {distance !== "—" ? <span className="text-muted-foreground">{distance}</span> : null}
            {salon.priceFrom > 0 ? <span>{shortPrice(salon.priceFrom)}+</span> : null}
          </div>
        </div>
        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="flex w-full items-center justify-center rounded-xl bg-foreground py-2 text-[12px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
      </div>
    </div>
  );
}

function SheetHandle() {
  return (
    <div className="flex shrink-0 justify-center py-2">
      <div className="h-1 w-10 rounded-full bg-border/80" />
    </div>
  );
}

export function MapSalonSheet({
  salons,
  activeId,
  onActiveChange,
  query,
  onQueryChange,
  onExpandedChange,
}: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(false);
  const panStartRef = useRef(0);

  const [halfHeight, setHalfHeight] = useState(360);
  const [expandedHeight, setExpandedHeight] = useState(640);
  const [expanded, setExpanded] = useState(false);

  const sheetHeight = useMotionValue(halfHeight);

  useEffect(() => {
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;

    const measure = () => {
      const h = parent.clientHeight;
      const half = Math.round(h * 0.5);
      setHalfHeight(half);
      setExpandedHeight(Math.max(half + 40, h - 8));
      if (!expandedRef.current) {
        sheetHeight.set(half);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [sheetHeight]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  const gridSalons = salons.slice(0, GRID_COUNT);
  const topRow = gridSalons.slice(0, 3);
  const bottomRow = gridSalons.slice(3, 6);
  const activeSalon = salons.find((s) => s.id === activeId) ?? gridSalons[0];

  const snapSheet = (open: boolean) => {
    expandedRef.current = open;
    setExpanded(open);
    animate(sheetHeight, open ? expandedHeight : halfHeight, sheetSpring);
  };

  const onPanStart = () => {
    panStartRef.current = sheetHeight.get();
  };

  const onPan = (_: unknown, info: PanInfo) => {
    const next = panStartRef.current - info.offset.y;
    sheetHeight.set(Math.max(halfHeight, Math.min(expandedHeight, next)));
  };

  const onPanEnd = (_: unknown, info: PanInfo) => {
    const travel = expandedHeight - halfHeight;
    const progress = (sheetHeight.get() - halfHeight) / travel;

    if (expandedRef.current) {
      if (info.velocity.y > VELOCITY_COLLAPSE || info.offset.y > travel * SNAP_EXPAND_RATIO) {
        snapSheet(false);
      } else {
        snapSheet(true);
      }
      return;
    }

    if (info.velocity.y < VELOCITY_EXPAND || progress >= SNAP_EXPAND_RATIO) {
      snapSheet(true);
    } else {
      snapSheet(false);
    }
  };

  return (
    <>
      {expanded ? (
        <motion.div
          className="absolute inset-0 z-20 bg-black/25"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => snapSheet(false)}
        />
      ) : null}

      <motion.div
        ref={sheetRef}
        style={{
          height: sheetHeight,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[22px] bg-background shadow-[0_-12px_48px_rgba(0,0,0,0.18)] ring-1 ring-border/30"
      >
        <motion.div
          onPanStart={onPanStart}
          onPan={onPan}
          onPanEnd={onPanEnd}
          className="flex shrink-0 cursor-grab flex-col touch-none active:cursor-grabbing"
        >
          <SheetHandle />

          <div className="px-4 pb-3" onPointerDown={(e) => e.stopPropagation()}>
            <div className="relative rounded-full border border-border/50 bg-surface py-2.5 pl-10 pr-4">
              <Search
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2.4}
              />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t("map.search") as string}
                className="w-full bg-transparent text-[13px] font-semibold placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {gridSalons.length > 0 ? (
            <div className="flex flex-col gap-2 px-4 pb-3">
              <SalonGridRow items={topRow} activeId={activeId} onActiveChange={onActiveChange} />
              {bottomRow.length > 0 ? (
                <SalonGridRow items={bottomRow} activeId={activeId} onActiveChange={onActiveChange} />
              ) : null}
            </div>
          ) : null}

          {activeSalon ? (
            <div className="px-4 pb-3">
              <SalonPeekCard salon={activeSalon} />
            </div>
          ) : null}
        </motion.div>

        {expanded ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("map.allSalons", { defaultValue: "Barcha salonlar" })}
            </p>
            <ul className="space-y-3">
              {salons.map((salon) => (
                <li key={salon.id}>
                  <button
                    type="button"
                    onClick={() => onActiveChange(salon.id)}
                    className={cn(
                      "w-full text-left",
                      salon.id === activeId && "rounded-2xl ring-2 ring-foreground/20 ring-offset-2",
                    )}
                  >
                    <SalonPeekCard salon={salon} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </motion.div>
    </>
  );
}
