import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SalonCard } from "@/components/SalonCard";
import type { HomeData } from "@/components/home/useHomeData";
import { getCategoryCoverUrl } from "@/lib/cover-images";
import {
  HOME_CATEGORY_KEYS,
  HOME_CATEGORY_ROW_AFTER,
  HOME_SALON_ROW_PREVIEW,
  buildHomeSalonSections,
} from "@/lib/home-sections";
import type { Category } from "@/lib/mock-data";

type Props = Pick<HomeData, "filtered">;

export function HomeDiscoverySections({ filtered }: Props) {
  const sections = useMemo(() => buildHomeSalonSections(filtered), [filtered]);

  return (
    <>
      {sections.map((section, index) => (
        <div key={section.id}>
          <HomeSalonRowCarousel
            titleKey={section.titleKey}
            salons={section.salons}
            viewAllTo={section.viewAllTo}
          />
          {index === HOME_CATEGORY_ROW_AFTER - 1 ? <HomeCategoryStrip /> : null}
        </div>
      ))}
    </>
  );
}

function HomeSalonRowCarousel({
  titleKey,
  salons,
  viewAllTo,
}: {
  titleKey: string;
  salons: HomeData["filtered"];
  viewAllTo: string;
}) {
  const { t } = useTranslation();
  const preview = salons.slice(0, HOME_SALON_ROW_PREVIEW);
  if (preview.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between px-5">
        <h2 className="text-lg font-bold tracking-tight">{t(titleKey)}</h2>
        <Link to={viewAllTo} className="flex items-center text-[12px] font-bold text-foreground">
          {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-1">
        {preview.map((salon) => (
          <div key={salon.id} className="w-[240px] shrink-0">
            <SalonCard salon={salon} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeCategoryStrip() {
  const { t } = useTranslation();

  return (
    <section className="mt-8 px-5">
      <h2 className="mb-4 text-lg font-bold tracking-tight">{t("home.sections.browseCategories")}</h2>
      <div className="grid grid-cols-2 gap-3">
        {HOME_CATEGORY_KEYS.map((category) => (
          <CategoryCard key={category} category={category} label={t(`home.categories.${category}`)} />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category, label }: { category: Category; label: string }) {
  return (
    <Link
      to="/category/$category"
      params={{ category }}
      className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface"
    >
      <img
        src={getCategoryCoverUrl(category, 640)}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform group-active:scale-[1.02]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <p className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white">{label}</p>
    </Link>
  );
}
