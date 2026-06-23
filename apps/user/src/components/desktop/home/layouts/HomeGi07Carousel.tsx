import { cn } from "@/lib/utils";
import type { HomeGiLayoutProps } from "@/lib/home-gi-layouts";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import {
  BazaarFilterSidebar,
  BazaarHeroBanner,
  BazaarMapPanel,
  BazaarSectionHeader,
} from "../bazaar/BazaarParts";
import { BazaarExploreRowSection } from "../bazaar/BazaarExploreRowSection";
import type { Salon } from "@/lib/mock-data";
import { HOME_SALON_ROW_PREVIEW } from "@/lib/home-sections";
import {
  HomeNearbyTitle,
  useHomeLayoutSlice,
} from "./home-layout-shared";

function HorizontalSalonRow({
  title,
  count,
  viewAllTo,
  salons,
}: {
  title: string;
  count: number;
  viewAllTo: string;
  salons: Salon[];
}) {
  const preview = salons.slice(0, HOME_SALON_ROW_PREVIEW);
  if (preview.length === 0) return null;

  return (
    <section className="min-w-0">
      <BazaarSectionHeader title={title} count={count} viewAllTo={viewAllTo} className="mb-3" />
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {preview.map((salon) => (
          <div key={salon.id} className="w-[min(240px,42vw)] shrink-0">
            <DesktopSalonCard salon={salon} variant="marketplace" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** GI-07 — gorizontal scroll qatorlar (Netflix uslubi) */
export function HomeGi07Carousel({ data }: HomeGiLayoutProps) {
  const { t, filtered, mapSalons, loading, exploreRow, salonSections } = useHomeLayoutSlice(data);

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 overflow-x-clip", DESKTOP_BAZAAR_INSET)}>
      <BazaarHeroBanner className="h-[clamp(200px,24vw,300px)]" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <HomeNearbyTitle count={filtered.length} className="mb-0" />
        <div className="w-full sm:max-w-xs">
          <BazaarFilterSidebar {...data} className="!p-3" />
        </div>
      </div>
      <div className="h-[200px] overflow-hidden rounded-2xl border border-border">
        <BazaarMapPanel salons={mapSalons} nearbyCount={filtered.length} className="h-full w-full" />
      </div>
      {!loading
        ? salonSections.map((section) =>
            section.variant === "explore" ? (
              <div key={section.id} className="overflow-x-auto">
                <BazaarExploreRowSection
                  titleKey={section.titleKey}
                  styles={exploreRow}
                  viewAllTo={section.viewAllTo}
                />
              </div>
            ) : (
              <HorizontalSalonRow
                key={section.id}
                title={t(section.titleKey)}
                count={section.salons.length}
                viewAllTo={section.viewAllTo}
                salons={section.salons}
              />
            ),
          )
        : null}
    </div>
  );
}
