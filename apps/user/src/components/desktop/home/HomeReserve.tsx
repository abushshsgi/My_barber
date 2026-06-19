import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { MarketplaceHeroSearch } from "./shared/MarketplaceHeroSearch";
import { cn } from "@/lib/utils";

type Props = { data: HomeData };

/** Reserve — Booking.com: ko'k hero + oq qidiruv + grid */
export function HomeReserve({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading, personalized } = data;

  return (
    <div className="-mx-8">
      <section className="bg-[#003580] px-8 pb-10 pt-8 text-white">
        <h1 className="text-3xl font-bold md:text-4xl">{t("home.title")}</h1>
        <p className="mt-2 max-w-xl text-white/80">{t("homePage.editorialTagline")}</p>
        <div className="mt-8 rounded-xl bg-white p-3 shadow-xl">
          <MarketplaceHeroSearch {...data} />
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {data.visibleCategoryKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => data.setCat(key)}
              className={cn(
                "rounded-md border px-4 py-2 text-sm font-semibold",
                data.effectiveCat === key
                  ? "border-[#003580] bg-[#003580] text-white"
                  : "border-border bg-white hover:border-[#003580]",
              )}
            >
              {t(`home.categories.${key}`)}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold text-[#003580]">
          {t(personalized ? "homePage.nearYou" : "homePage.pickedForYou")}
        </h2>
        <p className="text-sm text-muted-foreground">{filtered.length} ta natija</p>

        {loading ? (
          <div className="mt-6 grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {filtered.map((salon) => (
              <div key={salon.id} className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
                <DesktopSalonCard salon={salon} variant="marketplace" />
              </div>
            ))}
          </div>
        )}

        <Link
          to="/map"
          className="mt-8 inline-flex rounded-md bg-[#003580] px-6 py-3 text-sm font-bold text-white"
        >
          {t("common.viewMap")} →
        </Link>
      </div>
    </div>
  );
}
