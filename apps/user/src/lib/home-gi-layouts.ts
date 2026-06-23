import type { ComponentType } from "react";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeGi01BazaarClassic } from "@/components/desktop/home/layouts/HomeGi01BazaarClassic";
import { HomeGi02MapHero } from "@/components/desktop/home/layouts/HomeGi02MapHero";
import { HomeGi03WideGrid } from "@/components/desktop/home/layouts/HomeGi03WideGrid";
import { HomeGi04SplitList } from "@/components/desktop/home/layouts/HomeGi04SplitList";
import { HomeGi05Magazine } from "@/components/desktop/home/layouts/HomeGi05Magazine";
import { HomeGi06RightRail } from "@/components/desktop/home/layouts/HomeGi06RightRail";
import { HomeGi07Carousel } from "@/components/desktop/home/layouts/HomeGi07Carousel";
import { HomeGi08Bento } from "@/components/desktop/home/layouts/HomeGi08Bento";
import { HomeGi09Minimal } from "@/components/desktop/home/layouts/HomeGi09Minimal";
import { HomeGi10Editorial } from "@/components/desktop/home/layouts/HomeGi10Editorial";

export type HomeGiLayoutId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";

export type HomeGiLayoutMeta = {
  id: HomeGiLayoutId;
  slug: string;
  title: string;
  subtitle: string;
};

export type HomeGiLayoutProps = { data: HomeData };

const GI_IDS: HomeGiLayoutId[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export const HOME_GI_LAYOUTS: HomeGiLayoutMeta[] = [
  {
    id: "1",
    slug: "bazaar-classic",
    title: "GI-01 · Bazaar Classic",
    subtitle: "Filter chapda, 3 kartochka markazda, xarita o‘ngda — hozirgi asosiy layout.",
  },
  {
    id: "2",
    slug: "map-hero",
    title: "GI-02 · Map Hero",
    subtitle: "Katta xarita chapda (sticky), filter va salonlar o‘ng ustunda.",
  },
  {
    id: "3",
    slug: "wide-grid",
    title: "GI-03 · Wide Grid",
    subtitle: "To‘liq kenglik: yuqorida filter, 5 ustunli grid, pastda xarita chizig‘i.",
  },
  {
    id: "4",
    slug: "split-list",
    title: "GI-04 · Split List",
    subtitle: "Chapda qator kartochkalar ro‘yxati, o‘ngda to‘liq balandlikdagi xarita.",
  },
  {
    id: "5",
    slug: "magazine",
    title: "GI-05 · Magazine",
    subtitle: "Birinchi salon katta feature + xarita, pastda 4 ustunli grid.",
  },
  {
    id: "6",
    slug: "right-rail",
    title: "GI-06 · Right Rail",
    subtitle: "Salonlar keng chap maydon, filter va xarita tor o‘ng railda.",
  },
  {
    id: "7",
    slug: "carousel",
    title: "GI-07 · Carousel",
    subtitle: "Har bo‘lim gorizontal scroll — Netflix uslubidagi qatorlar.",
  },
  {
    id: "8",
    slug: "bento",
    title: "GI-08 · Bento",
    subtitle: "Turli o‘lchamdagi hujayralar: hero, xarita, filter va kartochkalar bento gridda.",
  },
  {
    id: "9",
    slug: "minimal",
    title: "GI-09 · Minimal",
    subtitle: "Ixcham hero, zich 6 ustun, xarita alohida pastki panel.",
  },
  {
    id: "10",
    slug: "editorial",
    title: "GI-10 · Editorial",
    subtitle: "Katta hero, kategoriya chizig‘i, 2+3 asimmetrik kartochka qatorlari.",
  },
];

export const HOME_GI_LAYOUT_COMPONENTS: Record<
  HomeGiLayoutId,
  ComponentType<HomeGiLayoutProps>
> = {
  "1": HomeGi01BazaarClassic,
  "2": HomeGi02MapHero,
  "3": HomeGi03WideGrid,
  "4": HomeGi04SplitList,
  "5": HomeGi05Magazine,
  "6": HomeGi06RightRail,
  "7": HomeGi07Carousel,
  "8": HomeGi08Bento,
  "9": HomeGi09Minimal,
  "10": HomeGi10Editorial,
};

export function parseHomeGiLayout(value: unknown): HomeGiLayoutId {
  const raw = value == null ? "1" : String(value).trim();
  if (GI_IDS.includes(raw as HomeGiLayoutId)) return raw as HomeGiLayoutId;
  return "1";
}

export function homeGiLayoutMeta(id: HomeGiLayoutId): HomeGiLayoutMeta {
  return HOME_GI_LAYOUTS.find((l) => l.id === id) ?? HOME_GI_LAYOUTS[0]!;
}
