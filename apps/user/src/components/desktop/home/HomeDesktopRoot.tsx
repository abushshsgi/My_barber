import type { HomeData } from "@/components/home/useHomeData";
import { HomeBazaarLayout } from "./HomeBazaarLayout";

type Props = { data: HomeData };

export function HomeDesktopRoot({ data }: Props) {
  return <HomeBazaarLayout data={data} />;
}
