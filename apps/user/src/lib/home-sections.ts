import type { HomeData } from "@/components/home/useHomeData";
import type { Category, Salon } from "@/lib/mock-data";
import { filterTopSalons } from "@/lib/salon-top";

export type HomeSalonSection = {
  id: string;
  titleKey: string;
  salons: Salon[];
  viewAllTo: string;
  variant?: "salons" | "explore";
};

export const HOME_CATEGORY_KEYS: Category[] = ["barber", "beauty", "nails"];

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
      id: "explore",
      titleKey: "nav.explore",
      salons: [],
      viewAllTo: "/explore",
      variant: "explore",
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

  return sections.filter(
    (section) => section.variant === "explore" || section.salons.length > 0,
  );
}

export type HomeDataSlice = Pick<HomeData, "filtered">;
