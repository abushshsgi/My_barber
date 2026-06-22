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

function toMarkers(salons: MapSalon[]): SalonMapMarker[] {
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

type Props = {
  salons?: MapSalon[];
  salonCount?: number;
  className?: string;
};

export function BazaarMapPanel({ salons = [], salonCount = 0, className }: Props) {
  const { t } = useTranslation();
  const ctx = useRecommendContext();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const markers = useMemo(() => toMarkers(salons), [salons]);

  const userLocation = useMemo(() => {
    if (ctx.lat == null || ctx.lng == null) return null;
    if (!hasValidMapCoords(ctx.lat, ctx.lng)) return null;
    return { lat: ctx.lat, lng: ctx.lng };
  }, [ctx.lat, ctx.lng]);

  return (
    <aside className={cn("sticky top-28 self-start", className)}>
      <Link
        to="/map"
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
      >
        <div className="relative h-[200px] w-full shrink-0 overflow-hidden bg-surface">
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
        </div>

        <div className="border-t border-border/50 px-4 py-3.5">
          <p className="text-[15px] font-bold leading-snug tracking-tight">
            {salonCount > 0
              ? t("home.mapPreview.nearbyCount", {
                  count: salonCount,
                  defaultValue: "{{count}} ta salon yaqinda",
                })
              : t("home.mapPreview.explore", { defaultValue: "Yaqin salonlarni toping" })}
          </p>
          <span className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-bold text-background transition group-hover:opacity-95">
            {t("home.mapPreview.openMap", { defaultValue: "Xaritani ochish" })}
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </aside>
  );
}
