import type { HomeData } from "@/components/home/useHomeData";
import { useDesktopVariant } from "@/components/desktop/DesktopVariantContext";
import {
  HomeBazaarAtlas,
  HomeBazaarClassic,
  HomeBazaarHorizon,
  HomeBazaarLuxe,
  HomeBazaarSpread,
} from "./HomeBazaarLayouts";

type Props = { data: HomeData };

export function HomeDesktopRoot({ data }: Props) {
  const variant = useDesktopVariant();

  switch (variant) {
    case "spread":
      return <HomeBazaarSpread data={data} />;
    case "horizon":
      return <HomeBazaarHorizon data={data} />;
    case "atlas":
      return <HomeBazaarAtlas data={data} />;
    case "luxe":
      return <HomeBazaarLuxe data={data} />;
    case "classic":
    default:
      return <HomeBazaarClassic data={data} />;
  }
}
