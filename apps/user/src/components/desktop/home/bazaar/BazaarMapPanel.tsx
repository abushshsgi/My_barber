import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Wand2 } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MapStaticPreview } from "@/components/map/MapStaticPreview";
import { type SalonMapMarker } from "@/components/map/SalonMap";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { hasValidMapCoords } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const SalonMap = lazy(() =>
  import("@/components/map/SalonMap").then((m) => ({ default: m.SalonMap })),
);

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
  const empty = count <= 0;

  return (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[0_10px_36px_rgba(15,15,15,0.08)]",
        className,
      )}
    >
      <div className="map-home-preview relative h-full min-h-[200px] w-full overflow-hidden bg-surface">
        <div className="pointer-events-none absolute inset-0">
          <Suspense fallback={<MapStaticPreview markers={markers} className="h-full w-full" />}>
            <SalonMap
              markers={markers}
              autoFitMarkers
              fitPadding={{ top: 20, right: 16, bottom: 112, left: 16 }}
              fitMaxZoom={14}
              onMarkerSelect={() => {}}
              onMarkerNavigate={() => {}}
            />
          </Suspense>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(to_top,#fff_0%,#fff_28%,rgba(255,255,255,0.96)_40%,rgba(255,255,255,0.55)_54%,rgba(255,255,255,0.12)_68%,transparent_82%)]"
          aria-hidden
        />

        <div className="absolute inset-x-0 bottom-0 space-y-2 px-4 pb-4 pt-10">
          {empty ? (
            <>
              <p className="relative z-10 text-center text-base font-black tracking-tight text-foreground">
                {t("home.mapPreview.emptyTitle")}
              </p>
              <p className="relative z-10 text-center text-xs leading-snug text-muted-foreground">
                {t("home.mapPreview.emptyHint")}
              </p>
              <Link
                to="/ai-style"
                preload="intent"
                className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background shadow-lg transition hover:opacity-95"
              >
                <Wand2 className="size-4" strokeWidth={2.2} />
                {t("homePage.tryMorphAi")}
              </Link>
              <Link
                to="/explore"
                preload="intent"
                className="relative z-10 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background/95 py-2.5 text-xs font-bold transition hover:bg-background"
              >
                {t("homePage.browseStyles")}
                <ArrowUpRight className="size-3.5" />
              </Link>
            </>
          ) : (
            <Link to="/map" className="group block space-y-2.5">
              <p className="relative z-10 text-center text-lg font-black text-foreground">
                {t("home.mapPreview.nearbyCount", { count })}
              </p>
              <span className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background shadow-lg transition group-hover:opacity-95">
                {t("home.mapPreview.openMap", { defaultValue: "Xaritani ochish" })}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
