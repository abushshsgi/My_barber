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
    <div className="grid grid-cols-2 gap-5 xl:grid-cols-3 2xl:grid-cols-4 xl:gap-6">
      {salons.map((s) => (
        <DesktopSalonCard key={s.id} salon={s} variant="marketplace" />
      ))}
    </div>
  );
}

export function HomeBazaarClassic({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, loading } = data;

  return (
    <div className="w-full">
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(280px,340px)] xl:gap-8">
        <BazaarFilterSidebar {...data} />
        <section className="min-w-0">
          {loading ? <BazaarGridSkeleton cols={4} /> : <SalonGrid salons={filtered} />}
        </section>
        <BazaarMapPanel salons={filtered} salonCount={filtered.length} />
      </div>
    </div>
  );
}
