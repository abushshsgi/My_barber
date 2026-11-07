import { createFileRoute, notFound } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { CategorySalonsDesktopPage } from "@/components/desktop/pages/CategorySalonsDesktopPage";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";
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

function CategorySalonsRoute() {
  const { category: raw } = Route.useParams();
  const category = parseCategory(raw);
  if (!category) throw notFound();

  const { salons, loading } = useCategorySalons(category);

  return (
    <DesktopPageSplit
      mobile={<MysaloonPausedScreen />}
      desktop={<CategorySalonsDesktopPage category={category} salons={salons} loading={loading} />}
    />
  );
}
