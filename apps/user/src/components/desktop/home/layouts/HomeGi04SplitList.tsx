import { cn } from "@/lib/utils";
import type { HomeGiLayoutProps } from "@/lib/home-gi-layouts";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
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

const ROW =
  "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(200px,240px)_repeat(3,minmax(0,1fr))_minmax(300px,380px)]";

/** GI-04 — chap ro‘yxat (row cards), o‘ngda sticky xarita */
export function HomeGi04SplitList({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading } = useHomeLayoutSlice(data);
  const listSalons = filtered.slice(0, 8);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner className="h-[clamp(160px,18vw,220px)]" />
      <HomeNearbyTitle count={filtered.length} className="mb-0" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <BazaarFilterSidebar {...data} />
          {loading ? (
            <BazaarGridSkeleton cols={1} />
          ) : listSalons.length === 0 ? (
            <HomeEmptySalons />
          ) : (
            <div className="flex max-h-[min(72vh,680px)] flex-col gap-3 overflow-y-auto pr-1">
              {listSalons.map((salon) => (
                <DesktopSalonCard key={salon.id} salon={salon} variant="row" />
              ))}
            </div>
          )}
        </div>
        <div className="min-h-[400px] overflow-hidden rounded-2xl border border-border lg:sticky lg:top-[5.75rem] lg:min-h-[min(78vh,760px)]">
          <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
        </div>
      </div>
      <HomeSalonSectionsBlock data={data} rowClass={ROW} />
    </div>
  );
}
