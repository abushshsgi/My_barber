import type { HomeData } from "@/components/home/useHomeData";
import {
  HomeAiPromo,
  HomeAudience,
  HomeEditorialHero,
  HomeOfferBanner,
  HomeSalonCarousel,
  HomeSalonList,
  HomeSearchAndCategories,
  HomeTrendingStrip,
  HomeTrustStrip,
} from "@/components/home/HomeBlocks";

type Props = { data: HomeData };

/** v03 — Editorial: katta hero, featured carousel, to'liq ro'yxat (faqat mobil). */
export function HomeVariantEditorial({ data }: Props) {
  return (
    <>
      <header
        className="pt-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      />
      <HomeEditorialHero />
      <HomeAudience />
      {data.topOffer ? <HomeOfferBanner offer={data.topOffer} /> : null}
      <HomeSalonCarousel
        salons={data.featuredSalons}
        titleKey={data.personalized ? "homePage.nearYou" : "homePage.pickedForYou"}
      />
      <HomeTrendingStrip trending={data.trending} />
      <HomeAiPromo />
      <HomeSearchAndCategories {...data} />
      <HomeSalonList salons={data.filtered} />
      <HomeTrustStrip />
    </>
  );
}
