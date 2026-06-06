import type { HomeData } from "@/components/home/useHomeData";
import {
  HomeActionHero,
  HomeAudience,
  HomeHeader,
  HomeOfferBanner,
  HomeQuickLinks,
  HomeSalonList,
  HomeSearchAndCategories,
  HomeStories,
  HomeTrustStrip,
  QUICK_LINKS_SCROLL,
} from "@/components/home/HomeBlocks";

type Props = { data: HomeData };

/** v02 — Action hub: katta CTA, keyin qidiruv va salonlar. */
export function HomeVariantActionHub({ data }: Props) {
  return (
    <>
      <HomeHeader />
      <HomeAudience />
      <HomeStories />
      <HomeActionHero />
      <HomeSearchAndCategories {...data} />
      {data.topOffer ? <HomeOfferBanner offer={data.topOffer} /> : null}
      <HomeSalonList salons={data.filtered} />
      <HomeQuickLinks links={QUICK_LINKS_SCROLL} />
      <HomeTrustStrip />
    </>
  );
}
