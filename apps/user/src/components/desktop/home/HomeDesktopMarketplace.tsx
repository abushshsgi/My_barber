import { Link } from "@tanstack/react-router";
import { Map, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import type { HomeData } from "@/components/home/useHomeData";
import { MarketplaceHeroSearch } from "./marketplace/MarketplaceHeroSearch";
import { MarketplaceCategoryBar } from "./marketplace/MarketplaceCategoryBar";
import { MarketplaceListingGrid, MarketplaceListingRow } from "./marketplace/MarketplaceListingSections";

type Props = { data: HomeData };

export function HomeDesktopMarketplace({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, featuredSalons, trending, personalized, loading } = data;

  const topRated = [...filtered].sort((a, b) => b.rating - a.rating).slice(0, 12);
  const nearby = filtered.slice(0, 12);
  const budget = [...filtered].sort((a, b) => a.priceFrom - b.priceFrom).slice(0, 10);

  return (
    <div className="-mx-2">
      {/* Booking.com / Airbnb hero */}
      <section className="pb-6 pt-2">
        <h1 className="text-center text-[32px] font-semibold leading-tight tracking-tight md:text-[36px]">
          {t("home.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-center text-base text-muted-foreground">
          {t("homePage.editorialTagline")}
        </p>
        <div className="mt-8">
          <MarketplaceHeroSearch {...data} />
        </div>
      </section>

      <MarketplaceCategoryBar {...data} />

      <div className="mt-8 space-y-10">
        <MarketplaceListingRow
          title={t(personalized ? "homePage.nearYou" : "homePage.pickedForYou")}
          subtitle={t("homePage.sectionNearHint", { defaultValue: "Yaqin atrofdagi eng yaxshi salonlar" })}
          salons={featuredSalons.length > 0 ? featuredSalons : nearby.slice(0, 8)}
          viewAllTo="/map"
        />

        <MarketplaceListingRow
          title={t("homePage.quick.today", { defaultValue: "Bugun bo'sh vaqtlar" })}
          subtitle={t("homePage.sectionTodayHint", { defaultValue: "Hozir bron qilish mumkin" })}
          salons={nearby.slice(0, 10)}
          viewAllTo="/today"
        />

        {topRated.length > 0 ? (
          <MarketplaceListingRow
            title={t("homePage.sectionTopRated", { defaultValue: "Eng yuqori reytingli" })}
            subtitle={t("homePage.sectionTopRatedHint", { defaultValue: "4.8+ reytingli salonlar" })}
            salons={topRated}
          />
        ) : null}

        {budget.length > 0 ? (
          <MarketplaceListingRow
            title={t("homePage.sectionBudget", { defaultValue: "Arzon narxlarda" })}
            subtitle={t("homePage.sectionBudgetHint", { defaultValue: "Byudjet do'stona variantlar" })}
            salons={budget}
          />
        ) : null}

        {/* Map + AI promos — Airbnb-style wide cards */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/map"
            className="group relative flex h-44 items-end overflow-hidden rounded-2xl bg-[#1a1a2e] p-6 text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/40 to-[#1a1a2e]" />
            <Map className="absolute right-6 top-6 h-10 w-10 opacity-40" />
            <div className="relative">
              <p className="text-lg font-semibold">{t("common.viewMap")}</p>
              <p className="mt-1 text-sm text-white/70">Xaritada qidiring</p>
            </div>
          </Link>
          <Link
            to="/ai-style"
            className="group relative flex h-44 items-end overflow-hidden rounded-2xl bg-foreground p-6 text-background"
          >
            <Wand2 className="absolute right-6 top-6 h-10 w-10 opacity-30" />
            <div className="relative">
              <p className="text-lg font-semibold">{t("homePage.aiPromoTitle")}</p>
              <p className="mt-1 text-sm text-background/70">{t("homePage.aiPromoHint")}</p>
            </div>
          </Link>
        </div>

        {trending.length > 0 ? (
          <section>
            <h2 className="text-[22px] font-semibold tracking-tight">{t("homePage.quick.trends")}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Mashhur uslublarni sinab ko'ring</p>
            <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
              {trending.slice(0, 8).map((style) => (
                <Link
                  key={style.id}
                  to="/explore/$styleId"
                  params={{ styleId: style.id }}
                  className="w-[160px] shrink-0"
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-surface">
                    <img
                      src={getHairstyleImageUrl({ imageUrl: style.imageUrl })}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold">{style.title}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <MarketplaceListingGrid
          title={t("home.nearby")}
          subtitle={`${filtered.length} ta salon topildi`}
          salons={filtered}
          loading={loading}
          emptyHint={t("homePage.emptyHint")}
        />
      </div>
    </div>
  );
}
