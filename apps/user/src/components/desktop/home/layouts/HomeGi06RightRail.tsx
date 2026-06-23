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

const ROW =
  "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(200px,240px)_repeat(3,minmax(0,1fr))_minmax(300px,380px)]";

/** GI-06 — salonlar chapda keng, filter + xarita o‘ng rail */
export function HomeGi06RightRail({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading, topRowSalons } = useHomeLayoutSlice(data);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner className="h-[clamp(180px,20vw,260px)]" />
      <HomeNearbyTitle count={filtered.length} className="mb-0" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <HomeTopSalonsBlock loading={loading} salons={topRowSalons} cols={4} skeletonCols={4} />
        <div className="flex flex-col gap-4 lg:sticky lg:top-[5.75rem] lg:self-start">
          <BazaarFilterSidebar {...data} />
          <div className="min-h-[280px] overflow-hidden rounded-2xl border border-border">
            <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
          </div>
        </div>
      </div>
      <HomeSalonSectionsBlock data={data} rowClass={ROW} />
    </div>
  );
}
