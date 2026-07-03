import type { HomeData } from "@/components/home/useHomeData";
import { HomeAudience, HomeSearchAndCategories, HomeUnifiedSearchResults } from "@/components/home/HomeBlocks";
import { HomeMobileFeed } from "@/components/home/HomeMobileFeed";
import { HomeMobileTopBar } from "@/components/home/HomeMobileTopBar";

type Props = { data: HomeData };

/** Mobil bosh sahifa — qidiruv, filtr, salon ro'yxati. */
export function HomeVariantEditorial({ data }: Props) {
  return (
    <div className="page-stagger pb-2">
      <HomeMobileTopBar />
      <div className="px-4">
        <HomeAudience />
        <HomeSearchAndCategories {...data} />
      </div>
      {!data.searchActive ? <HomeMobileFeed salons={data.filtered.slice(0, 15)} /> : null}
      <HomeUnifiedSearchResults
        searchActive={data.searchActive}
        salons={data.filtered}
        barbers={data.filteredBarbers}
        loading={data.loading}
      />
    </div>
  );
}
