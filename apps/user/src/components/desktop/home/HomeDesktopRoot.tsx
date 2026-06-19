import type { HomeData } from "@/components/home/useHomeData";
import { useDesktopVariant } from "@/components/desktop/DesktopVariantContext";
import { HomeDesktopDashboard } from "./HomeDesktopDashboard";
import { HomeDesktopEditorial } from "./HomeDesktopEditorial";
import { HomeDesktopMarketplace } from "./HomeDesktopMarketplace";

type Props = { data: HomeData };

export function HomeDesktopRoot({ data }: Props) {
  const variant = useDesktopVariant();

  switch (variant) {
    case "dashboard":
      return <HomeDesktopDashboard data={data} />;
    case "editorial":
      return <HomeDesktopEditorial data={data} />;
    case "marketplace":
    default:
      return <HomeDesktopMarketplace data={data} />;
  }
}
