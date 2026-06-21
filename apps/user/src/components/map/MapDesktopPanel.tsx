import { Link } from "@tanstack/react-router";
import { Heart, Search, Star } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapFilters } from "@/components/map/MapFilters";
import {
  MapLoadingIndicator,
  MapPanelSkeleton,
} from "@/components/map/MapLoadingSkeleton";
import type { AudienceFilter } from "@/hooks/use-audience";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { useFavorites } from "@/hooks/use-favorites";
import { formatDistanceKm } from "@/lib/map-utils";
import type { MapFiltersState } from "@/lib/map-filters";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 640;

type Props = {
  salons: Salon[];
  highlightedId: string;
  scrollToId?: string;
  query: string;
  onQueryChange: (query: string) => void;
  filters: MapFiltersState;
  onFiltersChange: (next: MapFiltersState) => void;
  mapAudience: AudienceFilter;
  onSalonHover?: (id: string | null) => void;
  loading?: boolean;
  emptyMessage?: string;
};

function salonDescription(salon: Salon): string {
  const about = salon.about?.trim();
  if (about) return about;
  return salon.address?.trim() ?? "";
}

function SalonCoverImage({ salon, className }: { salon: Salon; className?: string }) {
  const fallback = getSalonCoverUrl(salon.coverSeed);
  const src = salon.coverUrl?.trim() || fallback;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== fallback) img.src = fallback;
        }}
      />
    </div>
  );
}

function MapDesktopSalonCard({
  salon,
  isActive,
  onHover,
}: {
  salon: Salon;
  isActive: boolean;
  onHover?: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const { isFav, toggle } = useFavorites();
  const fav = isFav(salon.id);
  const description = salonDescription(salon);
  const distance = formatDistanceKm(salon.distanceKm);

  return (
    <article
      data-desktop-salon-id={salon.id}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background transition-all",
        "shadow-[0_2px_14px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.11)]",
        isActive
          ? "border-foreground/35 ring-2 ring-foreground/12 shadow-[0_6px_22px_rgba(0,0,0,0.12)]"
          : "border-border/50",
      )}
      onMouseEnter={() => onHover?.(salon.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative">
        <Link
          to="/salon/$id"
          params={{ id: salon.id }}
          preload="intent"
          className="block w-full active:opacity-95"
        >
          <div className="aspect-[4/3] w-full overflow-hidden">
            <SalonCoverImage salon={salon} className="h-full w-full" />
          </div>
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(salon.id);
          }}
          aria-label="Sevimli"
          className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/95 shadow-sm transition active:scale-90"
        >
          <Heart
            className={cn("h-3.5 w-3.5", fav && "fill-foreground")}
            strokeWidth={2.2}
          />
        </button>
      </div>

      <div className="px-2.5 pb-2.5 pt-2">
        <div className="flex items-start justify-between gap-2">
          <Link to="/salon/$id" params={{ id: salon.id }} preload="intent" className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-[13px] font-bold leading-snug tracking-tight">
              {salon.name}
            </h3>
          </Link>
          {salon.rating > 0 ? (
            <div className="flex shrink-0 items-center gap-0.5 text-[12px] font-bold">
              <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
              <span>{salon.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        {description ? (
          <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="mt-1.5 flex items-end justify-between gap-2">
          <div className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
            {salon.reviewCount > 0 ? (
              <span>
                {salon.reviewCount} {t("map.reviews")}
              </span>
            ) : null}
            {salon.reviewCount > 0 && distance !== "—" ? <span> · </span> : null}
            {distance !== "—" ? <span>{distance}</span> : null}
          </div>
          {salon.priceFrom > 0 ? (
            <p className="shrink-0 text-right">
              <span className="text-[13px] font-bold tabular-nums">{shortPrice(salon.priceFrom)}</span>
              <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                {t("map.priceFromSuffix")}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MapDesktopPanel({
  salons,
  highlightedId,
  scrollToId,
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  mapAudience,
  onSalonHover,
  loading,
  emptyMessage,
}: Props) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollToId) return;
    const el = listRef.current?.querySelector(`[data-desktop-salon-id="${scrollToId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [scrollToId]);

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-border/60 bg-surface/40"
      style={{ width: PANEL_WIDTH, maxWidth: "100%" }}
    >
      <div className="shrink-0 space-y-3 border-b border-border/50 px-5 pb-3.5 pt-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("nav.map")}
          </p>
          <h1 className="mt-1 text-[20px] font-bold tracking-tight">
            {loading && salons.length === 0 ? (
              <MapLoadingIndicator label={t("map.loading")} />
            ) : (
              t("map.desktopResults", {
                count: salons.length,
                defaultValue: "{{count}} ta salon",
              })
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 rounded-full border border-border/50 bg-background py-2 pl-9 pr-3 shadow-sm">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2.4}
            />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t("map.search") as string}
              className="w-full bg-transparent text-[13px] font-semibold placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          {!loading ? (
            <MapFilters
              filters={filters}
              onChange={onFiltersChange}
              mapAudience={mapAudience}
              variant="dialog"
            />
          ) : null}
        </div>
      </div>

      <div
        ref={listRef}
        className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pl-5 pr-3"
      >
        {loading && salons.length === 0 ? (
          <div className="pointer-events-none">
            <MapPanelSkeleton />
          </div>
        ) : null}

        {!loading && salons.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-muted-foreground">
            {emptyMessage ?? t("map.empty")}
          </p>
        ) : null}

        {salons.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 pb-5">
            {salons.map((salon) => (
              <MapDesktopSalonCard
                key={salon.id}
                salon={salon}
                isActive={salon.id === highlightedId}
                onHover={onSalonHover}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
