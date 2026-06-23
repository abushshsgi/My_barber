import type { HomeData } from "@/components/home/useHomeData";
import type { Category, Salon } from "@/lib/mock-data";
import { filterTopSalons } from "@/lib/salon-top";

export type HomeSalonSection = {
  id: string;
  titleKey: string;
  salons: Salon[];
  viewAllTo: string;
};

export const HOME_CATEGORY_KEYS: Category[] = ["barber", "beauty", "nails", "spa"];

export const HOME_SALON_ROW_PREVIEW = 5;
export const HOME_CATEGORY_ROW_AFTER = 2;

export function buildHomeSalonSections(filtered: Salon[]): HomeSalonSection[] {
  const topSalons = filterTopSalons(filtered);
  const topIds = new Set(topSalons.map((s) => s.id));
  const rest = filtered.filter((s) => !topIds.has(s.id));

  const sections: HomeSalonSection[] = [
    {
      id: "top",
      titleKey: "home.topSalons.title",
      salons: topSalons,
      viewAllTo: "/top",
    },
    {
      id: "nearby",
      titleKey: "home.nearby",
      salons: rest,
      viewAllTo: "/map",
    },
    {
      id: "picked",
      titleKey: "homePage.pickedForYou",
      salons: rest.slice(HOME_SALON_ROW_PREVIEW),
      viewAllTo: "/map",
    },
    {
      id: "more",
      titleKey: "home.sections.moreSalons",
      salons: rest.slice(HOME_SALON_ROW_PREVIEW * 2),
      viewAllTo: "/map",
    },
  ];

  return sections.filter((section) => section.salons.length > 0);
}

export type HomeDataSlice = Pick<HomeData, "filtered">;
