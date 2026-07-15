import { Link } from "@tanstack/react-router";
import { motion, animate, useMotionValue, type PanInfo } from "framer-motion";
import { Search, Star } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MapFilters } from "@/components/map/MapFilters";
import type { AudienceFilter } from "@/hooks/use-audience";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import type { MapFiltersState } from "@/lib/map-filters";
import { cn } from "@/lib/utils";

const GRID_COUNT = 6;
const GRID_CELL_H = 108;
const GRID_GAP = 10;
const GRID_PADDING_Y = 24;
const GRID_HEIGHT = GRID_CELL_H * 2 + GRID_GAP + GRID_PADDING_Y;
const PEEK_HEIGHT = 112;
const DETAIL_REVEAL_PX = 20;
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
  filters: MapFiltersState;
  onFiltersChange: (next: MapFiltersState) => void;
  mapAudience: AudienceFilter;
  onExpandedChange?: (expanded: boolean) => void;
  headerSlot?: ReactNode;
};

function SalonCoverImage({ salon, className }: { salon: Salon; className?: string }) {
  const primary = salon.coverUrl?.trim() || PLACEHOLDER_SALON;
  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(salon.coverUrl?.trim() || PLACEHOLDER_SALON);
  }, [salon.coverUrl]);

  return (
    <div className={cn("h-full w-full overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (src !== PLACEHOLDER_SALON) setSrc(PLACEHOLDER_SALON);
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
        "relative w-full overflow-hidden rounded-xl border-2 border-border bg-surface shadow-soft active:scale-[0.98]",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      style={{ height: GRID_CELL_H }}
    >
      <SalonCoverImage salon={salon} className="absolute inset-0" />
    </button>
  );
}

function EmptyGridCell() {
  return (
    <div
      className="rounded-xl border border-dashed border-border/60 bg-surface/80"
      style={{ height: GRID_CELL_H }}
      aria-hidden
    />
  );
}

function SalonGrid({
  salons,
  activeId,
  onActiveChange,
}: {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
}) {
  const slots = Array.from({ length: GRID_COUNT }, (_, i) => salons[i] ?? null);

  return (
    <div
      className="grid shrink-0 grid-cols-3 gap-2.5 px-4 py-3"
      style={{ height: GRID_HEIGHT, gridTemplateRows: `${GRID_CELL_H}px ${GRID_CELL_H}px` }}
    >
      {slots.map((salon, i) =>
        salon ? (
          <SalonGridCell
            key={salon.id}
            salon={salon}
            isActive={salon.id === activeId}
            onSelect={() => onActiveChange(salon.id)}
          />
        ) : (
          <EmptyGridCell key={`empty-${i}`} />
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
      className="neo-panel flex shrink-0 overflow-hidden p-0 shadow-card"
      style={{ height: PEEK_HEIGHT }}
    >
      <div className="h-full w-[108px] shrink-0 overflow-hidden">
        <Link to="/salon/$id" params={{ id: salon.id }} className="block h-full w-full">
          <SalonCoverImage salon={salon} />
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
          className="neo-cta flex w-full items-center justify-center bg-primary py-2 text-[12px] font-bold text-primary-foreground"
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
  filters,
  onFiltersChange,
  mapAudience,
  onExpandedChange,
  headerSlot,
}: Props) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(false);
  const panStartRef = useRef(0);

  const [collapsedHeight, setCollapsedHeight] = useState(280);
  const [expandedHeight, setExpandedHeight] = useState(640);
  const [expanded, setExpanded] = useState(false);
  const [detailRevealed, setDetailRevealed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const sheetHeight = useMotionValue(collapsedHeight);
  const collapsedHeightRef = useRef(collapsedHeight);

  useEffect(() => {
    collapsedHeightRef.current = collapsedHeight;
  }, [collapsedHeight]);

  useEffect(() => {
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;

    const measure = () => {
      const viewportH = parent.clientHeight;
      const headerH = headerRef.current?.offsetHeight ?? 280;
      const collapsed = Math.ceil(headerH);
      setCollapsedHeight(collapsed);
      setExpandedHeight(Math.max(collapsed + 40, viewportH - 8));
      if (!expandedRef.current) {
        sheetHeight.set(collapsed);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [sheetHeight]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  const gridSalons = salons.slice(0, GRID_COUNT);
  const activeSalon = salons.find((s) => s.id === activeId) ?? null;

  const updateDetailReveal = (height: number) => {
    setDetailRevealed(height > collapsedHeightRef.current + DETAIL_REVEAL_PX);
  };

  const snapSheet = (open: boolean) => {
    expandedRef.current = open;
    setExpanded(open);
    setDetailRevealed(open);
    animate(sheetHeight, open ? expandedHeight : collapsedHeight, sheetSpring);
  };

  const onPanStart = () => {
    panStartRef.current = sheetHeight.get();
    setIsDragging(true);
  };

  const onPan = (_: unknown, info: PanInfo) => {
    const next = panStartRef.current - info.offset.y;
    const clamped = Math.max(collapsedHeight, Math.min(expandedHeight, next));
    sheetHeight.set(clamped);
    updateDetailReveal(clamped);
  };

  const onPanEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    const travel = expandedHeight - collapsedHeight;
    const progress = (sheetHeight.get() - collapsedHeight) / travel;

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
        style={{ height: sheetHeight }}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[22px] border-t-2 border-border bg-surface pb-[env(safe-area-inset-bottom,0px)] shadow-dock"
      >
        <motion.div
          ref={headerRef}
          onPanStart={onPanStart}
          onPan={onPan}
          onPanEnd={onPanEnd}
          className="flex shrink-0 cursor-grab flex-col touch-none active:cursor-grabbing"
        >
          <SheetHandle />

          {headerSlot ? (
            <div className="shrink-0 px-4 pb-2" onPointerDown={(e) => e.stopPropagation()}>
              {headerSlot}
            </div>
          ) : null}

          <div className="shrink-0 px-4 pb-2" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 rounded-full border border-border/50 bg-surface py-2.5 pl-10 pr-4">
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
              <MapFilters
                filters={filters}
                onChange={onFiltersChange}
                mapAudience={mapAudience}
                variant="dialog"
              />
            </div>
          </div>

          <SalonGrid salons={gridSalons} activeId={activeId} onActiveChange={onActiveChange} />
        </motion.div>

        {detailRevealed || expanded || isDragging ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {detailRevealed && activeSalon ? (
              <div className="shrink-0 px-4 pb-3 pt-1">
                <SalonPeekCard salon={activeSalon} />
              </div>
            ) : null}

            {expanded ? (
              <div className="px-4 pb-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("map.allSalons", { defaultValue: "Barcha salonlar" })}
                </p>
                <ul className="space-y-3">
                  {salons
                    .filter((salon) => salon.id !== activeId)
                    .map((salon) => (
                      <li key={salon.id}>
                        <button
                          type="button"
                          onClick={() => onActiveChange(salon.id)}
                          className="w-full text-left"
                        >
                          <SalonPeekCard salon={salon} />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </>
  );
}
