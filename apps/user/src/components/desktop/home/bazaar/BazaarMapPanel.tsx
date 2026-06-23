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
  className?: string;
};

export function BazaarMapPanel({ salons = [], className }: Props) {
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
    <Link
      to="/map"
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[0_10px_36px_rgba(15,15,15,0.08)] transition-all hover:shadow-[0_14px_44px_rgba(15,15,15,0.12)]",
        className,
      )}
    >
      <div className="map-home-preview relative min-h-0 w-full flex-1 overflow-hidden bg-surface">
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

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(to_top,#fff_0%,#fff_32%,rgba(255,255,255,0.96)_44%,rgba(255,255,255,0.55)_56%,rgba(255,255,255,0.12)_68%,transparent_80%)]"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10">
          <p className="relative z-10 mb-2.5 text-center text-sm font-bold text-foreground">
            {t("home.mapPreview.nearbyCount", { count: salons.length })}
          </p>
          <span className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background shadow-lg transition group-hover:opacity-95">
            {t("home.mapPreview.openMap", { defaultValue: "Xaritani ochish" })}
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
