import { cn } from "@/lib/utils";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { DESKTOP_HOME_INSET } from "@/lib/desktop-bazaar-layout";
import {
  BazaarFilterSidebar,
  BazaarHeroBanner,
  BazaarMapPanel,
} from "./bazaar/BazaarParts";
import { HomeSalonSectionsBlock, useHomeLayoutSlice } from "./home-layout-shared";
import { HomeUnifiedSearchResults } from "@/components/home/HomeBlocks";
import { SubscriptionWinBackBanner } from "@/components/subscriptions/SubscriptionWinBackBanner";
import { HomeMobileMixedDiscovery } from "@/components/home/HomeMobileSections";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";

type Props = { data: HomeData };

const ROW = "grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-1";

/** Bento: hero + xarita, filter + kartochkalar */
export function HomeBazaarClassic({ data }: Props) {
  const { filtered, mapSalons, loading } = useHomeLayoutSlice(data);
  const featuredSalons = filtered.slice(0, 6);

  return (
    <div className={cn("page-stagger flex w-full min-w-0 flex-col gap-5 overflow-x-clip", DESKTOP_HOME_INSET)}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
        <div className="lg:col-span-8 lg:row-span-1">
          <BazaarHeroBanner className="h-full" />
        </div>
        <div className="min-h-[200px] overflow-hidden rounded-2xl border border-border lg:col-span-4">
          <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
        </div>
        <div className="lg:col-span-3 lg:row-start-2">
          <BazaarFilterSidebar {...data} className="min-h-[320px] lg:min-h-0" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 lg:col-span-9 lg:row-start-2">
          {data.searchActive ? (
            <div className="col-span-full">
              <HomeUnifiedSearchResults
                searchActive={data.searchActive}
                salons={data.filtered}
                barbers={data.filteredBarbers}
                loading={data.loading}
              />
            </div>
          ) : featuredSalons.length === 0 && !loading ? (
            <div className="col-span-full">
              <NoSalonsEmpty />
            </div>
          ) : (
            <>
          {featuredSalons.map((salon) => (
            <div key={salon.id} className="min-w-0">
              <DesktopSalonCard salon={salon} variant="marketplace" />
            </div>
          ))}
          {loading ? (
            <div className="col-span-full h-40 animate-pulse rounded-xl bg-surface" />
          ) : null}
            </>
          )}
        </div>
      </div>
      {!data.searchActive ? <SubscriptionWinBackBanner className="px-0" /> : null}
      {!data.searchActive ? (
        <div className="min-w-0 overflow-hidden">
          <HomeMobileMixedDiscovery items={data.mixedDiscovery} />
        </div>
      ) : null}
      <HomeSalonSectionsBlock data={data} rowClass={ROW} showCategoryStrip={!data.searchActive} />
      <div className="hidden h-6 lg:block" aria-hidden />
    </div>
  );
}
