import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import type { Salon } from "@/lib/mock-data";
import { BazaarSectionHeader } from "./BazaarParts";

const PREVIEW_COUNT = 4;

type Props = {
  salons: Salon[];
};

export function BazaarTopSalonsSection({ salons }: Props) {
  const { t } = useTranslation();
  const preview = salons.slice(0, PREVIEW_COUNT);

  if (preview.length === 0) return null;

  return (
    <section className="min-w-0 lg:col-span-4 lg:col-start-2">
      <BazaarSectionHeader
        title={t("home.topSalons.title")}
        count={salons.length}
        viewAllTo="/top"
        className="mb-4"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {preview.map((salon) => (
          <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" />
        ))}
      </div>
    </section>
  );
}

export function BazaarTopSalonsSectionSkeleton() {
  return (
    <div className="min-w-0 lg:col-span-4 lg:col-start-2">
      <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[5/4] rounded-xl bg-surface" />
            <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
