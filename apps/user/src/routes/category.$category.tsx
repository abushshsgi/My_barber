import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { CategorySalonsDesktopPage } from "@/components/desktop/pages/CategorySalonsDesktopPage";
import { MobileListPage } from "@/components/mobile/MobileListPage";
import { MobileSalonCard } from "@/components/mobile/MobileSalonCard";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import { useCategorySalons } from "@/hooks/use-category-salons";
import type { Category } from "@/lib/mock-data";

const CATEGORY_VALUES = ["barber", "beauty", "nails"] as const;

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
    <MobileListPage
      title={t(`home.categories.${category}`)}
      subtitle={t("categorySalonsPage.subtitle")}
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : salons.length === 0 ? (
        <NoSalonsEmpty
          compact
          titleKey="homePage.noSalonsYet"
          descriptionKey="homePage.noSalonsYetHint"
        />
      ) : (
        <div className="space-y-3">
          {salons.map((salon) => (
            <MobileSalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      )}
    </MobileListPage>
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
