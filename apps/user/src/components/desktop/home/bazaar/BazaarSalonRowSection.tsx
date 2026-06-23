import { useTranslation } from "react-i18next";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import type { Salon } from "@/lib/mock-data";
import { HOME_SALON_ROW_PREVIEW } from "@/lib/home-sections";
import { BazaarSectionHeader } from "./BazaarParts";

type Props = {
  titleKey: string;
  salons: Salon[];
  viewAllTo?: string;
};

export function BazaarSalonRowSection({ titleKey, salons, viewAllTo }: Props) {
  const { t } = useTranslation();
  const preview = salons.slice(0, HOME_SALON_ROW_PREVIEW);

  if (preview.length === 0) return null;

  return (
    <section className="min-w-0 lg:col-span-5 lg:col-start-1">
      <BazaarSectionHeader
        title={t(titleKey)}
        count={salons.length}
        viewAllTo={viewAllTo}
        className="mb-4"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {preview.map((salon) => (
          <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" />
        ))}
      </div>
    </section>
  );
}

export function BazaarSalonRowSectionSkeleton() {
  return (
    <div className="min-w-0 lg:col-span-5 lg:col-start-1">
      <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: HOME_SALON_ROW_PREVIEW }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[5/4] rounded-xl bg-surface" />
            <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
