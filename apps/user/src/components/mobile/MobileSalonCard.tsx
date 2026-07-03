import { SalonCardPremium } from "@mybarber/user-ui";
import type { Salon } from "@/lib/mock-data";
import { toUiSalon } from "@/lib/adapters/salon-ui";

type Props = {
  salon: Salon;
  layout?: "vertical" | "horizontal";
};

export function MobileSalonCard({ salon, layout = "horizontal" }: Props) {
  return <SalonCardPremium salon={toUiSalon(salon)} layout={layout} />;
}
