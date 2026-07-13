import { useTranslation } from "react-i18next";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { NoSalonsEmpty } from "@/components/NoSalonsEmpty";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import type { Category, Salon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  category: Category;
  salons: Salon[];
  loading: boolean;
};

export function CategorySalonsDesktopPage({ category, salons, loading }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full pb-12 pt-6", DESKTOP_BAZAAR_INSET)}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight xl:text-3xl">
          {t(`home.categories.${category}`)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("categorySalonsPage.subtitle")}</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[5/4] rounded-xl bg-surface" />
              <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
            </div>
          ))}
        </div>
      ) : salons.length === 0 ? (
        <div className="max-w-md">
          <NoSalonsEmpty />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {salons.map((salon) => (
            <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" />
          ))}
        </div>
      )}
    </div>
  );
}
