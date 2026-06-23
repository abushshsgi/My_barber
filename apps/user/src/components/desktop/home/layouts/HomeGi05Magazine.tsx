import { cn } from "@/lib/utils";
import type { HomeGiLayoutProps } from "@/lib/home-gi-layouts";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import {
  BazaarFilterSidebar,
  BazaarHeroBanner,
  BazaarMapPanel,
} from "../bazaar/BazaarParts";
import {
  HomeNearbyTitle,
  HomeSalonSectionsBlock,
  HomeTopSalonsBlock,
  useHomeLayoutSlice,
} from "./home-layout-shared";

const ROW = "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-1";

/** GI-05 — feature salon + xarita, pastda 4 ustun */
export function HomeGi05Magazine({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading, topRowSalons } = useHomeLayoutSlice(data);
  const featured = topRowSalons[0];
  const rest = topRowSalons.slice(1);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <HomeNearbyTitle count={filtered.length} className="mb-0" />
        <div className="w-full lg:max-w-xs">
          <BazaarFilterSidebar {...data} className="!p-3" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        {featured && !loading ? (
          <div className="min-h-[360px] overflow-hidden rounded-2xl">
            <DesktopSalonCard salon={featured} variant="marketplace" elevated className="h-full" />
          </div>
        ) : (
          <HomeTopSalonsBlock loading={loading} salons={[]} skeletonCols={1} />
        )}
        <div className="min-h-[280px] overflow-hidden rounded-2xl border border-border">
          <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
        </div>
      </div>
      <HomeTopSalonsBlock loading={loading} salons={rest} cols={4} skeletonCols={4} />
      <HomeSalonSectionsBlock data={data} rowClass={ROW} />
    </div>
  );
}
