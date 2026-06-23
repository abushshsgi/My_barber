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
  "grid w-full min-w-0 grid-cols-1 gap-4 overflow-x-clip lg:grid-cols-[minmax(200px,240px)_repeat(3,minmax(0,1fr))_minmax(300px,380px)] lg:items-start lg:gap-x-4";

/** GI-02 — katta xarita chapda, filter + kartochkalar o‘ngda */
export function HomeGi02MapHero({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading, topRowSalons } = useHomeLayoutSlice(data);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner className="h-[clamp(200px,22vw,280px)] [&>div]:h-full" />
      <HomeNearbyTitle count={filtered.length} className="mb-0" />
      <div className="grid min-h-[min(72vh,720px)] w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="min-h-[320px] overflow-hidden rounded-2xl border border-border lg:sticky lg:top-[5.75rem] lg:min-h-[min(72vh,720px)]">
          <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full min-h-[320px] w-full" />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <BazaarFilterSidebar {...data} />
          <HomeTopSalonsBlock loading={loading} salons={topRowSalons} cols={3} skeletonCols={3} />
        </div>
      </div>
      <HomeSalonSectionsBlock data={data} rowClass={ROW} />
    </div>
  );
}
