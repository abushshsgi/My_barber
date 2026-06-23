import type { HomeData } from "@/components/home/useHomeData";
import { HomeBazaarClassic } from "./HomeBazaarLayouts";

type Props = { data: HomeData };

export function HomeDesktopRoot({ data }: Props) {
  return <HomeBazaarClassic data={data} />;
}
