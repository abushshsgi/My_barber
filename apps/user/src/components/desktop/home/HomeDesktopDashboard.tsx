import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { MarketplaceHeroSearch } from "./marketplace/MarketplaceHeroSearch";
import { MarketplaceCategoryBar } from "./marketplace/MarketplaceCategoryBar";
import { MarketplaceListingGrid, MarketplaceListingRow } from "./marketplace/MarketplaceListingSections";

type Props = { data: HomeData };

/** Booking.com uslubi — qidiruv + kategoriya + listing qatorlari (Dashboard shell bilan). */
export function HomeDesktopDashboard({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, featuredSalons, personalized, loading } = data;

  return (
    <div>
      <MarketplaceHeroSearch {...data} />
      <div className="mt-6">
        <MarketplaceCategoryBar {...data} />
      </div>

      <div className="mt-8 flex gap-3">
        <Link to="/bookings" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface">
          {t("nav.bookings")}
        </Link>
        <Link to="/today" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface">
          {t("homePage.quick.today")}
        </Link>
        <Link to="/map" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface">
          {t("nav.map")}
        </Link>
      </div>

      <div className="mt-10 space-y-10">
        <MarketplaceListingRow
          title={t(personalized ? "homePage.nearYou" : "homePage.pickedForYou")}
          salons={featuredSalons.length > 0 ? featuredSalons : filtered.slice(0, 8)}
          viewAllTo="/map"
        />
        <MarketplaceListingGrid
          title={t("home.nearby")}
          salons={filtered}
          loading={loading}
          emptyHint={t("homePage.emptyHint")}
        />
      </div>
    </div>
  );
}
