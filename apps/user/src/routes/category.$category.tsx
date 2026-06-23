import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { CategorySalonsDesktopPage } from "@/components/desktop/pages/CategorySalonsDesktopPage";
import { PageHeader } from "@/components/PageHeader";
import { SalonCard } from "@/components/SalonCard";
import { useCategorySalons } from "@/hooks/use-category-salons";
import type { Category } from "@/lib/mock-data";

const CATEGORY_VALUES = ["barber", "beauty", "nails", "spa"] as const;

function parseCategory(value: string): Category | null {
  return (CATEGORY_VALUES as readonly string[]).includes(value) ? (value as Category) : null;
}

export const Route = createFileRoute("/category/$category")({
  head: ({ params }) => ({
    meta: [{ title: `${params.category} — mysaloon.uz` }],
  }),
  component: CategorySalonsRoute,
});

function CategorySalonsMobile({ category }: { category: Category }) {
  const { t } = useTranslation();
  const { salons, loading } = useCategorySalons(category);

  return (
    <div className="pb-8">
      <PageHeader
        showBack
        title={t(`home.categories.${category}`)}
        subtitle={t("categorySalonsPage.subtitle")}
      />
      {loading ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : salons.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("categorySalonsPage.empty")}</p>
      ) : (
        <div className="mt-2 space-y-3 px-5">
          {salons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySalonsRoute() {
  const { category: raw } = Route.useParams();
  const category = parseCategory(raw);
  if (!category) throw notFound();

  const { salons, loading } = useCategorySalons(category);

  return (
    <DesktopPageSplit
      mobile={<CategorySalonsMobile category={category} />}
      desktop={<CategorySalonsDesktopPage category={category} salons={salons} loading={loading} />}
    />
  );
}
