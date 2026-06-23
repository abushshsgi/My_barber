import { cn } from "@/lib/utils";
import type { HomeGiLayoutProps } from "@/lib/home-gi-layouts";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { BAZAAR_ELEVATED_TILE_H, DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarHeroBanner,
  BazaarMapPanel,
} from "../bazaar/BazaarParts";
import {
  HomeEmptySalons,
  HomeNearbyTitle,
  HomeSalonSectionsBlock,
  useHomeLayoutSlice,
} from "./home-layout-shared";

const BAZAAR_ROW_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-4 overflow-x-clip lg:grid-cols-[minmax(200px,240px)_repeat(3,minmax(0,1fr))_minmax(300px,380px)] lg:items-start lg:gap-x-4 lg:[--bazaar-card-w:calc((100%_-_240px_-_380px_-_4*1rem)_/_3)]";

const BAZAAR_TOP_ROW_CLASS =
  "grid w-full min-w-0 grid-cols-1 gap-4 overflow-x-clip lg:grid-cols-[minmax(200px,220px)_repeat(4,minmax(0,1fr))] lg:items-start lg:gap-x-3 lg:[--bazaar-card-w:calc((100%_-_220px_-_4*0.75rem)_/_4)] lg:[--bazaar-tile-h:calc(var(--bazaar-card-w)*0.75+5rem)]";

const CENTER_COLS = ["lg:col-start-2", "lg:col-start-3", "lg:col-start-4"] as const;

/** GI-01 — filter | 3 kartochka | xarita */
export function HomeGi01BazaarClassic({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading, topRowSalons } = useHomeLayoutSlice(data);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner />
      <div className="flex w-full min-w-0 flex-col gap-4 overflow-x-clip">
        <HomeNearbyTitle count={filtered.length} className="mb-0" />
        <div className={BAZAAR_TOP_ROW_CLASS}>
          <div className="lg:sticky lg:top-[5.75rem] lg:col-start-1">
            <BazaarFilterSidebar {...data} className={cn("w-full", BAZAAR_ELEVATED_TILE_H)} />
          </div>
          {loading ? (
            <div className="min-w-0 overflow-hidden lg:col-span-3 lg:col-start-2">
              <BazaarGridSkeleton cols={3} />
            </div>
          ) : topRowSalons.length === 0 ? (
            <div className="min-w-0 overflow-hidden lg:col-span-3 lg:col-start-2">
              <HomeEmptySalons />
            </div>
          ) : (
            topRowSalons.map((salon, index) => (
              <div key={salon.id} className={cn("min-w-0 overflow-hidden", CENTER_COLS[index])}>
                <div className={BAZAAR_ELEVATED_TILE_H}>
                  <DesktopSalonCard salon={salon} variant="marketplace" elevated className="h-full" />
                </div>
              </div>
            ))
          )}
          <div className="min-w-0 overflow-hidden lg:col-start-5">
            <div className={BAZAAR_ELEVATED_TILE_H}>
              <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
            </div>
          </div>
        </div>
        <HomeSalonSectionsBlock data={data} rowClass={BAZAAR_ROW_CLASS} />
      </div>
    </div>
  );
}
