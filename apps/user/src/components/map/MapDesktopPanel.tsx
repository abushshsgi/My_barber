import { Link } from "@tanstack/react-router";
import { Heart, Search, Star } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapFilters } from "@/components/map/MapFilters";
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
        "group flex flex-col rounded-2xl p-1 transition-colors",
        isActive && "bg-foreground/[0.04] ring-2 ring-foreground/15",
      )}
      onMouseEnter={() => onHover?.(salon.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-background shadow-sm transition-all hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)]",
          isActive ? "border-foreground/40" : "border-border/50",
        )}
      >
        <Link
          to="/salon/$id"
          params={{ id: salon.id }}
          preload="intent"
          className="block w-full active:opacity-95"
        >
          <div className="aspect-[16/10] w-full overflow-hidden">
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
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/95 shadow-sm transition active:scale-90"
        >
          <Heart
            className={cn("h-4 w-4", fav && "fill-foreground")}
            strokeWidth={2.2}
          />
        </button>
      </div>

      <div className="px-1 pb-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <Link to="/salon/$id" params={{ id: salon.id }} preload="intent" className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight">
              {salon.name}
            </h3>
          </Link>
          {salon.rating > 0 ? (
            <div className="flex shrink-0 items-center gap-1 pt-0.5 text-[13px] font-bold">
              <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
              <span>{salon.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        {description ? (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="mt-2.5 flex items-end justify-between gap-3">
          <div className="min-w-0 text-[12px] font-medium text-muted-foreground">
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
              <span className="text-[15px] font-bold tabular-nums">{shortPrice(salon.priceFrom)}</span>
              <span className="ml-1 text-[12px] font-medium text-muted-foreground">
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
            {loading
              ? t("map.loading")
              : t("map.desktopResults", {
                  count: salons.length,
                  defaultValue: "{{count}} ta salon",
                })}
          </h1>
        </div>
        <div className="relative rounded-full border border-border/50 bg-background py-2 pl-9 pr-3 shadow-sm">
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
      </div>

      <div
        ref={listRef}
        className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 py-3 pl-5 pr-3"
      >
        <MapFilters
          filters={filters}
          onChange={onFiltersChange}
          mapAudience={mapAudience}
          variant="inline"
        />

        {loading && salons.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
        ) : null}

        {!loading && salons.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-muted-foreground">
            {emptyMessage ?? t("map.empty")}
          </p>
        ) : null}

        {salons.length > 0 ? (
          <div className="flex flex-col gap-5 pb-5">
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
