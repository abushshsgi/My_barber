import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import {
  BazaarFilterSidebar,
  BazaarGridSkeleton,
  BazaarMapPanel,
  BazaarPageTitle,
} from "./bazaar/BazaarParts";

type Props = { data: HomeData };

function SalonGrid({ salons }: { salons: HomeData["filtered"] }) {
  return (
    <div className="grid grid-cols-2 gap-5 xl:grid-cols-2 2xl:grid-cols-3 xl:gap-6">
      {salons.map((s) => (
        <DesktopSalonCard key={s.id} salon={s} variant="marketplace" />
      ))}
    </div>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, mapSalons, loading } = data;
  const sidebarSalonLeft = filtered[0];
  const sidebarSalonRight = filtered[1];

  return (
    <div className="w-full">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
      <div className="grid w-full grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(320px,400px)] xl:gap-8">
        <BazaarFilterSidebar {...data} sidebarSalon={sidebarSalonLeft} />
        <section className="min-w-0">
          {loading ? <BazaarGridSkeleton cols={3} /> : <SalonGrid salons={filtered} />}
        </section>
        <BazaarMapPanel
          salons={mapSalons}
          salonCount={filtered.length}
          sidebarSalon={sidebarSalonRight}
        />
      </div>
    </div>
  );
}
