import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { MarketplaceHeroSearch } from "./marketplace/MarketplaceHeroSearch";
import { MarketplaceCategoryBar } from "./marketplace/MarketplaceCategoryBar";
import { MarketplaceListingGrid, MarketplaceListingRow } from "./marketplace/MarketplaceListingSections";

type Props = { data: HomeData };

/** Booking.com uslubi — katta hero + listing (Editorial shell bilan). */
export function HomeDesktopEditorial({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, featuredSalons, personalized, loading } = data;

  return (
    <div>
      <section className="relative -mx-8 mb-8 overflow-hidden bg-[#003580] px-8 py-14 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#003580] via-[#00224f] to-[#001a3d]" />
        <div className="relative mx-auto max-w-[850px] text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("home.title")}</h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-white/80">{t("homePage.editorialTagline")}</p>
          <div className="mt-8 rounded-2xl bg-white p-2 shadow-2xl">
            <MarketplaceHeroSearch {...data} />
          </div>
        </div>
      </section>

      <MarketplaceCategoryBar {...data} />

      <div className="mt-10 space-y-10">
        <MarketplaceListingRow
          title={t(personalized ? "homePage.nearYou" : "homePage.pickedForYou")}
          subtitle="Mijozlar sevgan salonlar"
          salons={featuredSalons.length > 0 ? featuredSalons : filtered.slice(0, 8)}
          viewAllTo="/map"
        />
        <MarketplaceListingGrid
          title={t("home.nearby")}
          subtitle="Barcha mavjud salonlar"
          salons={filtered}
          loading={loading}
          emptyHint={t("homePage.emptyHint")}
        />
      </div>
    </div>
  );
}
