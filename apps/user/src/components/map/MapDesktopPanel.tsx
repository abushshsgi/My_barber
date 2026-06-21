import { Link } from "@tanstack/react-router";
import { Heart, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 520;

type Props = {
  salons: Salon[];
  highlightedId: string;
  scrollToId?: string;
  query: string;
  onQueryChange: (query: string) => void;
  onSalonHover?: (id: string | null) => void;
  loading?: boolean;
  emptyMessage?: string;
};

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
        className="absolute inset-0 h-full w-full object-cover object-center"
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
  const { isFav, toggle } = useFavorites();
  const fav = isFav(salon.id);

  return (
    <article
      data-desktop-salon-id={salon.id}
      className={cn(
        "flex flex-col",
        isActive && "rounded-2xl ring-2 ring-foreground/15",
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
            className={cn("h-4 w-4", fav && "fill-foreground")}
            strokeWidth={2.2}
          />
        </button>
      </div>
      <Link to="/salon/$id" params={{ id: salon.id }} preload="intent">
        <h3 className="mt-2 line-clamp-2 px-0.5 text-[13px] font-bold leading-snug tracking-tight">
          {salon.name}
        </h3>
      </Link>
    </article>
  );
}

export function MapDesktopPanel({
  salons,
  highlightedId,
  scrollToId,
  query,
  onQueryChange,
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
      <div className="shrink-0 space-y-3 border-b border-border/50 px-4 pb-3.5 pt-4">
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
        className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pl-4 pr-2.5"
      >
        {loading && salons.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
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
