import type { HomeData } from "@/components/home/useHomeData";
import {
  HomeAudience,
  HomeOfferBanner,
  HomeSalonCarousel,
  HomeSearchAndCategories,
  HomeTrendingStrip,
  HomeUnifiedSearchResults,
} from "@/components/home/HomeBlocks";
import { HomeDiscoverySections } from "@/components/home/HomeDiscoverySections";
import { HomeMobileTopBar } from "@/components/home/HomeMobileTopBar";
import { HomeQuickAccessChips } from "@/components/home/HomeQuickAccessChips";

type Props = { data: HomeData };

/** Mobil bosh sahifa — qidiruv birinchi, tez kirish, keyin kashfiyot qatorlari. */
export function HomeVariantEditorial({ data }: Props) {
  const nearbyPreview = data.filtered.slice(0, 8);

  return (
    <div className="page-stagger">
      <HomeMobileTopBar />
      <HomeAudience />
      <HomeSearchAndCategories {...data} />
      <HomeQuickAccessChips />
      {data.topOffer ? <HomeOfferBanner offer={data.topOffer} /> : null}
      {!data.searchActive && nearbyPreview.length > 0 ? (
        <HomeSalonCarousel salons={nearbyPreview} titleKey="home.nearby" />
      ) : null}
      {!data.searchActive ? <HomeTrendingStrip trending={data.trending} /> : null}
      {!data.searchActive ? <HomeDiscoverySections filtered={data.filtered} /> : null}
      <HomeUnifiedSearchResults
        searchActive={data.searchActive}
        salons={data.filtered}
        barbers={data.filteredBarbers}
        loading={data.loading}
      />
    </div>
  );
}
