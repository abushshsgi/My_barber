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
import { BazaarCategoryStrip } from "../bazaar/BazaarCategoryStrip";
import {
  HomeEmptySalons,
  HomeNearbyTitle,
  HomeSalonSectionsBlock,
  useHomeLayoutSlice,
} from "./home-layout-shared";

const ROW = "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-1";

/** GI-10 — editorial: katta hero, kategoriya, 2+3 asimmetrik qator */
export function HomeGi10Editorial({ data }: HomeGiLayoutProps) {
  const { filtered, mapSalons, loading, topRowSalons } = useHomeLayoutSlice(data);
  const pair = topRowSalons.slice(0, 2);
  const trio = topRowSalons.slice(2, 5);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-8 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner className="h-[clamp(300px,38vw,480px)]" />
      <BazaarCategoryStrip />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <HomeNearbyTitle count={filtered.length} className="mb-0" />
        <div className="grid w-full gap-4 lg:max-w-md lg:grid-cols-2">
          <BazaarFilterSidebar {...data} className="lg:col-span-2 !p-3" />
          <div className="min-h-[160px] overflow-hidden rounded-2xl border border-border lg:col-span-2">
            <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
          </div>
        </div>
      </div>
      {loading ? (
        <BazaarGridSkeleton cols={3} />
      ) : topRowSalons.length === 0 ? (
        <HomeEmptySalons />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pair.map((salon) => (
              <DesktopSalonCard key={salon.id} salon={salon} variant="editorial" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {trio.map((salon) => (
              <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" elevated />
            ))}
          </div>
        </div>
      )}
      <HomeSalonSectionsBlock data={data} rowClass={ROW} showCategoryStrip={false} />
    </div>
  );
}
