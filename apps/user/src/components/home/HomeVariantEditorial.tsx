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

/** v03 — Editorial: katta hero, featured carousel, to'liq ro'yxat. */
export function HomeVariantEditorial({ data }: Props) {
  const searchProps = { ...data };

  return (
    <div className="lg:px-6 lg:pb-8">
      <header
        className="pt-4 lg:hidden"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      />

      <div className="lg:grid lg:grid-cols-3 lg:gap-5 lg:pt-4">
        <div className="lg:col-span-2">
          <HomeEditorialHero />
        </div>
        <div className="hidden lg:flex lg:flex-col lg:justify-center">
          <HomeAudience />
        </div>
      </div>

      <div className="lg:hidden">
        <HomeAudience />
      </div>

      {data.topOffer ? (
        <div className="lg:hidden">
          <HomeOfferBanner offer={data.topOffer} />
        </div>
      ) : null}

      <div className="hidden lg:sticky lg:top-14 lg:z-20 lg:-mx-6 lg:block lg:border-b lg:border-border/60 lg:bg-background/95 lg:px-6 lg:py-4 lg:backdrop-blur-md">
        <HomeSearchAndCategories {...searchProps} />
      </div>

      <div className="lg:mt-8 lg:grid lg:grid-cols-[1fr_minmax(280px,340px)] lg:items-start lg:gap-6">
        <HomeSalonCarousel
          salons={data.featuredSalons}
          titleKey={data.personalized ? "homePage.nearYou" : "homePage.pickedForYou"}
        />
        {data.topOffer ? (
          <div className="hidden lg:block lg:pt-8">
            <HomeOfferBanner offer={data.topOffer} />
          </div>
        ) : null}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <HomeTrendingStrip trending={data.trending} />
        <HomeAiPromo />
      </div>

      <div className="lg:hidden">
        <HomeSearchAndCategories {...searchProps} />
      </div>

      <HomeSalonList salons={data.filtered} />
      <HomeTrustStrip />
    </div>
  );
}
