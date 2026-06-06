import type { HomeData } from "@/components/home/useHomeData";
import {
  HomeAudience,
  HomeHeader,
  HomeOfferBanner,
  HomeQuickLinks,
  HomeSalonList,
  HomeSearchAndCategories,
  HomeStories,
  HomeTrendingStrip,
  HomeTrustStrip,
  QUICK_LINKS_COMPACT,
} from "@/components/home/HomeBlocks";

type Props = { data: HomeData };

/** v01 — Discovery: salonlar birinchi, keyin aksiya va trend. */
export function HomeVariantDiscovery({ data }: Props) {
  return (
    <>
      <HomeHeader />
      <HomeAudience />
      <HomeStories />
      <HomeSearchAndCategories {...data} />
      <HomeSalonList salons={data.filtered} />
      {data.topOffer ? <HomeOfferBanner offer={data.topOffer} /> : null}
      <HomeTrendingStrip trending={data.trending} />
      <HomeQuickLinks links={QUICK_LINKS_COMPACT} />
      <HomeTrustStrip />
    </>
  );
}
