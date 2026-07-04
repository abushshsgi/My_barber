import type { HomeData } from "@/components/home/useHomeData";
import { HomeMobilePage } from "@/components/home/HomeMobilePage";

type Props = { data: HomeData };

/** Mobil bosh sahifa. */
export function HomeVariantEditorial({ data }: Props) {
  return <HomeMobilePage data={data} />;
}
