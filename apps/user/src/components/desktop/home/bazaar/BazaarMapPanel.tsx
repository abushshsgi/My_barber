import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { SalonMap, type SalonMapMarker } from "@/components/map/SalonMap";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { hasValidMapCoords } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const PREVIEW_CARD_COUNT = 2;

function toMarkers(salons: Salon[]): SalonMapMarker[] {
  return salons
    .filter((s) => hasValidMapCoords(s.lat, s.lng))
    .slice(0, 14)
    .map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      label: s.name,
      priceLabel:
        s.priceFrom > 0
          ? shortPrice(s.priceFrom)
          : s.rating > 0
            ? `★ ${s.rating.toFixed(1)}`
            : s.name.split(" ")[0].slice(0, 10),
    }));
}

function MapPreviewSalonCard({ salon }: { salon: Salon }) {
  const cover = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed, salon.category);

  return (
    <Link
      to="/salon/$id"
      params={{ id: salon.id }}
      preload="intent"
      className="group block overflow-hidden rounded-xl border border-border/60 bg-background transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface">
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="space-y-0.5 px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-[13px] font-bold leading-snug">{salon.name}</h3>
          {salon.rating > 0 ? (
            <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-bold">
              <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
              {salon.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        {salon.priceFrom > 0 ? (
          <p className="text-[12px] font-semibold tabular-nums">
            {shortPrice(salon.priceFrom)}
            <span className="font-medium text-muted-foreground"> dan</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

type Props = {
  salons?: Salon[];
  salonCount?: number;
  className?: string;
};

export function BazaarMapPanel({ salons = [], salonCount = 0, className }: Props) {
  const { t } = useTranslation();
  const ctx = useRecommendContext();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const markers = useMemo(() => toMarkers(salons), [salons]);
  const previewSalons = useMemo(() => salons.slice(0, PREVIEW_CARD_COUNT), [salons]);

  const userLocation = useMemo(() => {
    if (ctx.lat == null || ctx.lng == null) return null;
    if (!hasValidMapCoords(ctx.lat, ctx.lng)) return null;
    return { lat: ctx.lat, lng: ctx.lng };
  }, [ctx.lat, ctx.lng]);

  return (
    <aside className={cn("sticky top-28 self-start", className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Link
          to="/map"
          className="group relative block overflow-hidden transition-all hover:opacity-[0.98]"
        >
          <div className="relative h-[210px] w-full overflow-hidden bg-surface">
            {mounted ? (
              <div className="pointer-events-none absolute inset-0">
                <MapErrorBoundary>
                  <SalonMap
                    markers={markers}
                    selectedId={null}
                    onMarkerSelect={() => {}}
                    onMarkerNavigate={() => {}}
                    showUserLocation={Boolean(userLocation)}
                    userLocation={userLocation}
                    autoFitMarkers
                  />
                </MapErrorBoundary>
              </div>
            ) : (
              <div className="absolute inset-0 animate-pulse bg-surface-2" />
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/95 via-background/55 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 px-4 pb-3.5 pt-1">
              <p className="text-[14px] font-bold leading-snug tracking-tight">
                {salonCount > 0
                  ? t("home.mapPreview.nearbyCount", {
                      count: salonCount,
                      defaultValue: "{{count}} ta salon yaqinda",
                    })
                  : t("home.mapPreview.explore", { defaultValue: "Yaqin salonlarni toping" })}
              </p>
              <span className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-bold text-background transition group-hover:opacity-95">
                {t("home.mapPreview.openMap", { defaultValue: "Xaritani ochish" })}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </div>
        </Link>

        {previewSalons.length > 0 ? (
          <div className="space-y-2.5 border-t border-border/50 px-3 py-3">
            {previewSalons.map((salon) => (
              <MapPreviewSalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        ) : null}

        <Link
          to="/map"
          className="flex w-full items-center justify-center gap-1 border-t border-border/50 py-3 text-sm font-bold text-foreground transition hover:bg-surface/60"
        >
          {t("home.mapPreview.seeMore", { defaultValue: "Ko'proq" })}
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </aside>
  );
}
