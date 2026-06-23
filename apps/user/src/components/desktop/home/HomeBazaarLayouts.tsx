import { cn } from "@/lib/utils";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import {
  BazaarFilterSidebar,
  BazaarHeroBanner,
  BazaarMapPanel,
} from "./bazaar/BazaarParts";
import { HomeSalonSectionsBlock, useHomeLayoutSlice } from "./home-layout-shared";

type Props = { data: HomeData };

const ROW = "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-1";

/** Bento: hero + xarita, filter + kartochkalar */
export function HomeBazaarClassic({ data }: Props) {
  const { filtered, mapSalons, loading } = useHomeLayoutSlice(data);
  const featuredSalons = filtered.slice(0, 5);
  const [a, b, c, d, e] = featuredSalons;

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
        <div className="lg:col-span-8 lg:row-span-1">
          <BazaarHeroBanner className="h-full min-h-[240px]" />
        </div>
        <div className="min-h-[240px] overflow-hidden rounded-2xl border border-border lg:col-span-4">
          <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
        </div>
        <div className="lg:col-span-3 lg:row-start-2">
          <BazaarFilterSidebar {...data} className="h-[250px] w-[260px]" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-9 lg:row-start-2">
          {[a, b, c, d, e].filter(Boolean).map((salon) =>
            salon ? (
              <div key={salon.id} className={cn("min-w-0", salon === a && "col-span-2 row-span-2")}>
                <DesktopSalonCard
                  salon={salon}
                  variant="marketplace"
                  elevated={salon === a}
                  className={salon === a ? "h-full" : undefined}
                />
              </div>
            ) : null,
          )}
          {loading ? (
            <div className="col-span-full h-40 animate-pulse rounded-xl bg-surface" />
          ) : null}
        </div>
      </div>
      <HomeSalonSectionsBlock data={data} rowClass={ROW} />
    </div>
  );
}
