import type { HomeData } from "@/components/home/useHomeData";
import {
  HomeAiPromo,
  HomeAudience,
  HomeEditorialHero,
  HomeOfferBanner,
  HomeSalonCarousel,
  HomeSalonList,
  HomeSearchAndCategories,
  HomeStories,
  HomeTrendingStrip,
  HomeTrustStrip,
} from "@/components/home/HomeBlocks";

type Props = { data: HomeData };

/** v03 — Editorial: katta hero, featured carousel, to'liq ro'yxat. */
export function HomeVariantEditorial({ data }: Props) {
  return (
    <>
      <header className="pt-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }} />
      <HomeEditorialHero />
      <HomeAudience />
      <HomeStories />
      {data.topOffer ? <HomeOfferBanner offer={data.topOffer} /> : null}
      <HomeSalonCarousel salons={data.featuredSalons} titleKey="homePage.pickedForYou" />
      <HomeTrendingStrip trending={data.trending} />
      <HomeAiPromo />
      <HomeSearchAndCategories {...data} />
      <HomeSalonList salons={data.filtered} />
      <HomeTrustStrip />
    </>
  );
}
