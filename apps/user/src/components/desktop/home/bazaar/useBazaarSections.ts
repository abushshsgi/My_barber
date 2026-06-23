import { useMemo } from "react";
import type { HomeData } from "@/components/home/useHomeData";

export function useBazaarSections(data: HomeData) {
  const { filtered, setCat } = data;

  const dealSalons = useMemo(
    () => [...filtered].sort((a, b) => b.rating - a.rating).slice(0, 10),
    [filtered],
  );

  const featuredSalons = useMemo(() => filtered.slice(0, 4), [filtered]);

  const scrollToSalons = () => {
    setCat("all");
    document.getElementById("nearby-salons")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectCategory = (cat: Parameters<typeof setCat>[0]) => {
    setCat(cat);
    document.getElementById("nearby-salons")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return { dealSalons, featuredSalons, scrollToSalons, selectCategory };
}
