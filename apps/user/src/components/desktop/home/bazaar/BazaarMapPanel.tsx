import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MapStaticPreview } from "@/components/map/MapStaticPreview";
import { type SalonMapMarker } from "@/components/map/SalonMap";
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
  nearbyCount?: number;
  className?: string;
};

export function BazaarMapPanel({ salons = [], nearbyCount, className }: Props) {
  const { t } = useTranslation();
  const markers = useMemo(() => toMarkers(salons), [salons]);
  const count = nearbyCount ?? salons.length;

  return (
    <Link
      to="/map"
      className={cn(
        "group relative block h-full overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[0_10px_36px_rgba(15,15,15,0.08)] transition-all hover:shadow-[0_14px_44px_rgba(15,15,15,0.12)]",
        className,
      )}
    >
      <div className="map-home-preview relative h-full w-full overflow-hidden bg-surface">
        <MapStaticPreview markers={markers} className="absolute inset-0" />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(to_top,#fff_0%,#fff_32%,rgba(255,255,255,0.96)_44%,rgba(255,255,255,0.55)_56%,rgba(255,255,255,0.12)_68%,transparent_80%)]"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10">
          <p className="relative z-10 mb-2.5 grid w-[180px] justify-center text-center text-lg font-black text-black mr-[150px] px-[100px]">
            {t("home.mapPreview.nearbyCount", { count })}
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
