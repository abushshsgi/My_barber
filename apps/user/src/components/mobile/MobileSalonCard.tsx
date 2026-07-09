import { SalonCardPremium } from "@mybarber/user-ui";
import type { Salon } from "@/lib/mock-data";
import { toUiSalon } from "@/lib/adapters/salon-ui";
import { prefetchSalonDetail } from "@/lib/prefetch-salon";

type Props = {
  salon: Salon;
  layout?: "vertical" | "horizontal";
  variant?: "solid" | "glass";
};

export function MobileSalonCard({ salon, layout = "horizontal", variant = "solid" }: Props) {
  return (
    <div
      className="block w-full min-w-0"
      onPointerEnter={() => prefetchSalonDetail(salon.id)}
      onTouchStart={() => prefetchSalonDetail(salon.id)}
    >
      <SalonCardPremium salon={toUiSalon(salon)} layout={layout} variant={variant} />
    </div>
  );
}
