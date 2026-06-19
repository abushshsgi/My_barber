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
    <div className="grid grid-cols-3 gap-5">
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
    <div>
      <BazaarPageTitle title={t("home.nearby")} count={filtered.length} />
      <div className="grid grid-cols-[260px_1fr_300px] gap-8">
        <BazaarFilterSidebar {...data} />
        <section>
          {loading ? <BazaarGridSkeleton cols={3} /> : <SalonGrid salons={filtered} />}
        </section>
        <BazaarMapPanel tall />
      </div>
    </div>
  );
}
