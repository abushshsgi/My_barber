import { Link } from "@tanstack/react-router";
import { Map, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import type { HomeData } from "@/components/home/useHomeData";
import { MarketplaceHeroSearch } from "./shared/MarketplaceHeroSearch";
import { MarketplaceCategoryBar } from "./shared/MarketplaceCategoryBar";
import { MarketplaceListingGrid, MarketplaceListingRow } from "./shared/MarketplaceListingSections";

type Props = { data: HomeData };

/** Voyage — Airbnb uslubi */
export function HomeVoyage({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, featuredSalons, trending, personalized, loading } = data;
  const topRated = [...filtered].sort((a, b) => b.rating - a.rating).slice(0, 12);
  const nearby = filtered.slice(0, 12);
  const budget = [...filtered].sort((a, b) => a.priceFrom - b.priceFrom).slice(0, 10);

  return (
    <div>
      <section className="pb-6 pt-2">
        <h1 className="text-center text-[32px] font-semibold tracking-tight md:text-[36px]">{t("home.title")}</h1>
        <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">{t("homePage.editorialTagline")}</p>
        <div className="mt-8">
          <MarketplaceHeroSearch {...data} />
        </div>
      </section>
      <MarketplaceCategoryBar {...data} />
      <div className="mt-8 space-y-10">
        <MarketplaceListingRow
          title={t(personalized ? "homePage.nearYou" : "homePage.pickedForYou")}
          salons={featuredSalons.length ? featuredSalons : nearby.slice(0, 8)}
          viewAllTo="/map"
        />
        <MarketplaceListingRow title={t("homePage.quick.today")} salons={nearby.slice(0, 10)} viewAllTo="/today" />
        {topRated.length > 0 ? <MarketplaceListingRow title="Eng yuqori reyting" salons={topRated} /> : null}
        {budget.length > 0 ? <MarketplaceListingRow title="Arzon narxlarda" salons={budget} /> : null}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/map" className="flex h-40 items-end rounded-2xl bg-neutral-900 p-6 text-white">
            <div>
              <p className="font-semibold">{t("common.viewMap")}</p>
              <p className="text-sm text-white/60">Xaritada qidiring</p>
            </div>
          </Link>
          <Link to="/ai-style" className="flex h-40 items-end rounded-2xl bg-foreground p-6 text-background">
            <div>
              <Wand2 className="mb-2 h-6 w-6" />
              <p className="font-semibold">{t("homePage.aiPromoTitle")}</p>
            </div>
          </Link>
        </div>
        {trending.length > 0 ? (
          <section>
            <h2 className="text-[22px] font-semibold">{t("homePage.quick.trends")}</h2>
            <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto">
              {trending.slice(0, 8).map((s) => (
                <Link key={s.id} to="/explore/$styleId" params={{ styleId: s.id }} className="w-[140px] shrink-0">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-surface">
                    <img src={getHairstyleImageUrl({ imageUrl: s.imageUrl })} alt="" className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-2 text-sm font-semibold">{s.title}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <MarketplaceListingGrid title={t("home.nearby")} salons={filtered} loading={loading} emptyHint={t("homePage.emptyHint")} />
      </div>
    </div>
  );
}
