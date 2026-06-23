import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeBazaarLayoutV1 } from "./HomeBazaarLayoutV1";
import { HomeBazaarLayoutV2 } from "./HomeBazaarLayoutV2";
import { HomeBazaarLayoutV3 } from "./HomeBazaarLayoutV3";
import {
  HomeLayoutSwitcher,
  persistHomeLayoutVariant,
  readHomeLayoutVariant,
  type HomeLayoutVariant,
} from "./HomeLayoutSwitcher";

type Props = { data: HomeData };

const LAYOUTS: Record<HomeLayoutVariant, ComponentType<Props>> = {
  v1: HomeBazaarLayoutV1,
  v2: HomeBazaarLayoutV2,
  v3: HomeBazaarLayoutV3,
};

export function HomeDesktopRoot({ data }: Props) {
  const [variant, setVariant] = useState<HomeLayoutVariant>("v1");

  useEffect(() => {
    setVariant(readHomeLayoutVariant());
  }, []);

  const selectVariant = (next: HomeLayoutVariant) => {
    setVariant(next);
    persistHomeLayoutVariant(next);
  };

  const Layout = LAYOUTS[variant];

  return (
    <div className="flex w-full flex-col gap-6">
      <HomeLayoutSwitcher value={variant} onChange={selectVariant} />
      <Layout data={data} />
    </div>
  );
}
