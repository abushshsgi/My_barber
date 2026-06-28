import type { HomeData } from "@/components/home/useHomeData";
import {
  HomeAiPromo,
  HomeAudience,
  HomeEditorialHero,
  HomeOfferBanner,
  HomeSearchAndCategories,
  HomeTrendingStrip,
  HomeTrustStrip,
  HomeUnifiedSearchResults,
} from "@/components/home/HomeBlocks";
import { HomeDiscoverySections } from "@/components/home/HomeDiscoverySections";

type Props = { data: HomeData };

/** v03 — Editorial: katta hero, featured carousel, to'liq ro'yxat (faqat mobil). */
export function HomeVariantEditorial({ data }: Props) {
  return (
    <div className="page-stagger">
      <header
        className="pt-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      />
      <HomeEditorialHero />
      <HomeAudience />
      {data.topOffer ? <HomeOfferBanner offer={data.topOffer} /> : null}
      <HomeDiscoverySections filtered={data.filtered} />
      <HomeTrendingStrip trending={data.trending} />
      <HomeAiPromo />
      <HomeSearchAndCategories {...data} />
      <HomeUnifiedSearchResults
        searchActive={data.searchActive}
        salons={data.filtered}
        barbers={data.filteredBarbers}
        loading={data.loading}
      />
      {!data.searchActive ? <HomeTrustStrip /> : null}
    </div>
  );
}
