import { cn } from "@/lib/utils";
import type { HomeGiLayoutProps } from "@/lib/home-gi-layouts";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import {
  BazaarFilterSidebar,
  BazaarMapPanel,
} from "../bazaar/BazaarParts";
import {
  HomeNearbyTitle,
  HomeSalonSectionsBlock,
  HomeTopSalonsBlock,
  useHomeLayoutSlice,
} from "./home-layout-shared";

const ROW = "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-1";

/** GI-09 — ixcham, zich 6 ustun, pastda xarita panel */
export function HomeGi09Minimal({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading } = useHomeLayoutSlice(data);
  const denseSalons = filtered.slice(0, 12);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-5 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <HomeNearbyTitle count={filtered.length} className="mb-0" />
        <div className="w-full lg:max-w-sm">
          <BazaarFilterSidebar {...data} className="!border-0 !p-0 !shadow-none" />
        </div>
      </div>
      <HomeTopSalonsBlock
        loading={loading}
        salons={denseSalons}
        cols={6}
        skeletonCols={6}
        className="gap-3"
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <HomeSalonSectionsBlock data={data} rowClass={ROW} showCategoryStrip={false} />
        <div className="h-[min(50vh,420px)] overflow-hidden rounded-2xl border border-border lg:sticky lg:top-[5.75rem]">
          <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
