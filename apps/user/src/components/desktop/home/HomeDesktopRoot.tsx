import type { HomeData } from "@/components/home/useHomeData";
import { useDesktopVariant } from "@/components/desktop/DesktopVariantContext";
import { HomeAtelier } from "./HomeAtelier";
import { HomeBazaar } from "./HomeBazaar";
import { HomeHub } from "./HomeHub";
import { HomeReserve } from "./HomeReserve";
import { HomeVoyage } from "./HomeVoyage";

type Props = { data: HomeData };

export function HomeDesktopRoot({ data }: Props) {
  const variant = useDesktopVariant();

  switch (variant) {
    case "reserve":
      return <HomeReserve data={data} />;
    case "atelier":
      return <HomeAtelier data={data} />;
    case "hub":
      return <HomeHub data={data} />;
    case "bazaar":
      return <HomeBazaar data={data} />;
    case "voyage":
    default:
      return <HomeVoyage data={data} />;
  }
}
