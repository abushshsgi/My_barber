import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MobileSalonCard } from "@/components/mobile/MobileSalonCard";
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
      <div className="mb-4 flex items-end justify-between px-4">
        <h2 className="text-lg font-extrabold tracking-tight">{t(titleKey)}</h2>
        <Link
          to={viewAllTo}
          className="neo-pill flex items-center px-3 py-1.5 text-[11px] font-bold text-foreground"
        >
          {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1">
        {preview.map((salon) => (
          <div key={salon.id} className="w-[260px] shrink-0">
            <MobileSalonCard salon={salon} layout="vertical" />
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeCategoryStrip() {
  const { t } = useTranslation();

  return (
    <section className="mt-8 px-4">
      <h2 className="label-eyebrow mb-3">{t("home.sections.browseCategories")}</h2>
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
      className="neo-panel group relative aspect-[4/3] overflow-hidden p-0 active:scale-[0.98]"
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
