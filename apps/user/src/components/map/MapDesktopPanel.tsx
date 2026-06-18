import { Link } from "@tanstack/react-router";
import { Search, Star } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  loading?: boolean;
  emptyMessage?: string;
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
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

function MapDesktopSalonCard({
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
    <article
      data-desktop-salon-id={salon.id}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-background shadow-sm transition-all hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)]",
        isActive ? "border-foreground/40 ring-2 ring-foreground/12" : "border-border/50",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left active:opacity-95">
        <div className="relative aspect-[5/4] overflow-hidden">
          <SalonCoverImage salon={salon} className="h-full w-full" />
          {salon.rating > 0 ? (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-background/95 px-2 py-0.5 text-[11px] font-bold shadow-sm">
              <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
              {salon.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="space-y-1 p-3 pb-2">
          <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight">{salon.name}</h3>
          {salon.address ? (
            <p className="line-clamp-1 text-[13px] text-muted-foreground">{salon.address}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-2 pt-0.5 text-[12px] font-semibold">
            {salon.priceFrom > 0 ? (
              <span>
                {shortPrice(salon.priceFrom)}
                <span className="font-medium text-muted-foreground"> {t("map.priceFromSuffix")}</span>
              </span>
            ) : null}
            {distance !== "—" ? <span className="text-muted-foreground">{distance}</span> : null}
          </div>
        </div>
      </button>
      <div className="mt-auto px-3 pb-3">
        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="flex w-full items-center justify-center rounded-xl bg-foreground py-2.5 text-[13px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
      </div>
    </article>
  );
}

export function MapDesktopPanel({
  salons,
  activeId,
  onActiveChange,
  query,
  onQueryChange,
  loading,
  emptyMessage,
}: Props) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId) return;
    const el = listRef.current?.querySelector(`[data-desktop-salon-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  return (
    <aside className="flex h-full w-[min(100%,520px)] shrink-0 flex-col border-r border-border/60 bg-surface/40">
      <div className="shrink-0 space-y-3 border-b border-border/50 px-5 pb-4 pt-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("nav.map")}
          </p>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight">
            {loading
              ? t("map.loading")
              : t("map.desktopResults", {
                  count: salons.length,
                  defaultValue: "{{count}} ta salon",
                })}
          </h1>
        </div>
        <div className="relative rounded-full border border-border/50 bg-background py-2.5 pl-10 pr-4 shadow-sm">
          <Search
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2.4}
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("map.search") as string}
            className="w-full bg-transparent text-[14px] font-semibold placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {loading && salons.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-muted-foreground">{t("map.loading")}</p>
        ) : null}

        {!loading && salons.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-muted-foreground">
            {emptyMessage ?? t("map.empty")}
          </p>
        ) : null}

        {salons.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {salons.map((salon) => (
              <MapDesktopSalonCard
                key={salon.id}
                salon={salon}
                isActive={salon.id === activeId}
                onSelect={() => onActiveChange(salon.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
