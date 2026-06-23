import { cn } from "@/lib/utils";
import type { HomeGiLayoutProps } from "@/lib/home-gi-layouts";
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

/** GI-03 — to‘liq kenglik grid, pastda xarita strip */
export function HomeGi03WideGrid({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading, topRowSalons } = useHomeLayoutSlice(data);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner className="h-[clamp(180px,20vw,260px)]" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <HomeNearbyTitle count={filtered.length} className="mb-0" />
        <div className="w-full lg:max-w-md">
          <BazaarFilterSidebar {...data} className="!p-3" />
        </div>
      </div>
      <HomeTopSalonsBlock loading={loading} salons={topRowSalons} cols={5} skeletonCols={5} />
      <div className="h-[220px] overflow-hidden rounded-2xl border border-border">
        <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
      </div>
      <HomeSalonSectionsBlock data={data} rowClass={ROW} />
    </div>
  );
}
