import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { SalonMap, type SalonMapMarker } from "@/components/map/SalonMap";
import { useRecommendContext } from "@/hooks/use-recommend-context";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { hasValidMapCoords } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

type MapSalon = Pick<Salon, "id" | "lat" | "lng" | "name" | "priceFrom" | "rating">;

const PREVIEW_MARKER_LIMIT = 5;
const PREVIEW_FIT_PADDING = { top: 28, right: 20, bottom: 168, left: 20 };
const PREVIEW_FIT_MAX_ZOOM = 12;

function buildMarker(s: MapSalon): SalonMapMarker {
  return {
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
  };
}

function toMarkers(salons: MapSalon[], preview: boolean): SalonMapMarker[] {
  const valid = salons.filter((s) => hasValidMapCoords(s.lat, s.lng));
  if (!preview) {
    return valid.slice(0, 14).map(buildMarker);
  }
  if (valid.length <= PREVIEW_MARKER_LIMIT) {
    return valid.map(buildMarker);
  }
  const step = Math.max(1, Math.floor(valid.length / PREVIEW_MARKER_LIMIT));
  return valid
    .filter((_, i) => i % step === 0)
    .slice(0, PREVIEW_MARKER_LIMIT)
    .map(buildMarker);
}

type Props = {
  salons?: MapSalon[];
  salonCount?: number;
  className?: string;
  variant?: "default" | "preview";
};

export function BazaarMapPanel({
  salons = [],
  salonCount = 0,
  className,
  variant = "default",
}: Props) {
  const { t } = useTranslation();
  const ctx = useRecommendContext();
  const [mounted, setMounted] = useState(false);
  const isPreview = variant === "preview";
  useEffect(() => setMounted(true), []);

  const markers = useMemo(() => (isPreview ? [] : toMarkers(salons, false)), [salons, isPreview]);

  const userLocation = useMemo(() => {
    if (ctx.lat == null || ctx.lng == null) return null;
    if (!hasValidMapCoords(ctx.lat, ctx.lng)) return null;
    return { lat: ctx.lat, lng: ctx.lng };
  }, [ctx.lat, ctx.lng]);

  return (
    <Link
      to="/map"
      className={cn(
        "group relative block h-full overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[0_10px_36px_rgba(15,15,15,0.08)] transition-all hover:shadow-[0_14px_44px_rgba(15,15,15,0.12)]",
        className,
      )}
    >
      <div className="relative h-full min-h-0 w-full overflow-hidden bg-surface">
        {mounted ? (
          <div className="map-home-preview pointer-events-none absolute inset-0">
            <MapErrorBoundary>
              <SalonMap
                markers={markers}
                selectedId={null}
                onMarkerSelect={() => {}}
                onMarkerNavigate={() => {}}
                showUserLocation={Boolean(userLocation) && !isPreview}
                userLocation={userLocation}
                autoFitMarkers
                fitPadding={isPreview ? PREVIEW_FIT_PADDING : undefined}
                fitMaxZoom={isPreview ? PREVIEW_FIT_MAX_ZOOM : undefined}
              />
            </MapErrorBoundary>
          </div>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-surface-2" />
        )}

        {isPreview ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(15,15,15,0.06)]">
            <p className="text-base font-bold tracking-tight">
              {salonCount > 0
                ? t("home.mapPreview.nearbyCount", {
                    count: salonCount,
                    defaultValue: "{{count}} ta salon yaqinda",
                  })
                : t("home.mapPreview.explore", { defaultValue: "Yaqin salonlarni toping" })}
            </p>
            <span className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-bold text-background">
              {t("home.mapPreview.openMap", { defaultValue: "Xaritani ochish" })}
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 bg-gradient-to-t from-background from-15% via-background/75 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-[2] px-4 pb-4 pt-2">
              <p className="text-lg font-bold tracking-tight">
                {salonCount > 0
                  ? t("home.mapPreview.nearbyCount", {
                      count: salonCount,
                      defaultValue: "{{count}} ta salon yaqinda",
                    })
                  : t("home.mapPreview.explore", { defaultValue: "Yaqin salonlarni toping" })}
              </p>
              <span className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background transition group-hover:opacity-95">
                {t("home.mapPreview.openMap", { defaultValue: "Xaritani ochish" })}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </>
        )}

        <div
          className="pointer-events-none absolute bottom-0 right-0 z-[21] h-7 w-[4.75rem] bg-background"
          aria-hidden
        />
      </div>
    </Link>
  );
}
