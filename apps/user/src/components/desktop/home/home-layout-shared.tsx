import { useMemo } from "react";
import type { HomeData } from "@/components/home/useHomeData";
import { cn } from "@/lib/utils";
import { BazaarCategoryStrip } from "./bazaar/BazaarCategoryStrip";
import { BazaarExploreRowSection, BazaarExploreRowSectionSkeleton } from "./bazaar/BazaarExploreRowSection";
import { BazaarSalonRowSection, BazaarSalonRowSectionSkeleton } from "./bazaar/BazaarSalonRowSection";
import {
  HOME_CATEGORY_ROW_AFTER,
  buildHomeSalonSections,
} from "@/lib/home-sections";

export function useHomeLayoutSlice(data: HomeData) {
  const { filtered, mapSalons, loading, exploreRow } = data;
  const salonSections = useMemo(() => buildHomeSalonSections(filtered), [filtered]);

  return {
    filtered,
    mapSalons,
    loading,
    exploreRow,
    salonSections,
  };
}

export function HomeSalonSectionsBlock({
  data,
  rowClass,
  showCategoryStrip = true,
}: {
  data: HomeData;
  rowClass?: string;
  showCategoryStrip?: boolean;
}) {
  const { loading, exploreRow, salonSections } = useHomeLayoutSlice(data);

  return (
    <>
      {salonSections.map((section, index) => (
        <div key={section.id}>
          <div className={rowClass}>
            {loading ? (
              section.variant === "explore" ? (
                <BazaarExploreRowSectionSkeleton />
              ) : (
                <BazaarSalonRowSectionSkeleton />
              )
            ) : section.variant === "explore" ? (
              <BazaarExploreRowSection
                titleKey={section.titleKey}
                styles={exploreRow}
                viewAllTo={section.viewAllTo}
              />
            ) : (
              <BazaarSalonRowSection
                titleKey={section.titleKey}
                salons={section.salons}
                viewAllTo={section.viewAllTo}
              />
            )}
          </div>
          {showCategoryStrip && !loading && index === HOME_CATEGORY_ROW_AFTER - 1 ? (
            <div className={cn(rowClass, "mt-4")}>
              <BazaarCategoryStrip />
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}
