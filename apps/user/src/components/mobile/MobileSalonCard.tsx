import { SalonCardPremium } from "@mybarber/user-ui";
import type { Salon } from "@/lib/mock-data";
import { toUiSalon } from "@/lib/adapters/salon-ui";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";

type Props = {
  salon: Salon;
  layout?: "vertical" | "horizontal";
};

export function MobileSalonCard({ salon, layout = "horizontal" }: Props) {
  return (
    <div
      className="contents"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
    >
      <SalonCardPremium salon={toUiSalon(salon)} layout={layout} />
    </div>
  );
}
