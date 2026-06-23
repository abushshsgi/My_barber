import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCategoryCoverUrl } from "@/lib/cover-images";
import { HOME_CATEGORY_KEYS } from "@/lib/home-sections";
import type { Category } from "@/lib/mock-data";

export function BazaarCategoryStrip() {
  const { t } = useTranslation();

  return (
    <section className="min-w-0 lg:col-span-5 lg:col-start-1">
      <h2 className="mb-4 text-xl font-bold tracking-tight xl:text-2xl">
        {t("home.sections.browseCategories")}
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      className="group relative aspect-[5/4] overflow-hidden rounded-2xl bg-surface"
    >
      <img
        src={getCategoryCoverUrl(category, 800)}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <p className="absolute bottom-4 left-4 right-4 text-lg font-bold text-white">{label}</p>
    </Link>
  );
}
