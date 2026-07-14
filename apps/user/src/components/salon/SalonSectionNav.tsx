import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { scrollToSalonSection, type SalonSectionId } from "@/lib/salon-scroll";
import { cn } from "@/lib/utils";

export type { SalonSectionId };

type NavItem = { id: SalonSectionId; label: string };

export function SalonSectionNav({ salon }: { salon: Salon }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SalonSectionId>("about");

  const items = useMemo((): NavItem[] => {
    const list: NavItem[] = [{ id: "about", label: t("salon.tabs.about") }];
    if (salon.amenities.length) list.push({ id: "amenities", label: t("salon.nav.amenities") });
    list.push({ id: "services", label: t("salon.tabs.services") });
    if (salon.staff.length) list.push({ id: "staff", label: t("salon.tabs.staff") });
    list.push({ id: "reviews", label: t("salon.tabs.reviews") });
    list.push({ id: "location", label: t("salon.nav.location") });
    if (salon.hours.length || salon.closedWeekdays.length) {
      list.push({ id: "hours", label: t("salon.hours.title") });
    }
    if (salon.portfolio.length) list.push({ id: "portfolio", label: t("salon.tabs.portfolio") });
    return list;
  }, [salon, t]);

  useEffect(() => {
    const ids = items.map((i) => i.id);
    const observers: IntersectionObserver[] = [];

    for (const id of ids) {
      const el = document.getElementById(`salon-${id}`);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  return (
    <nav className="sticky top-0 z-10 -mx-1 border-b border-border bg-background/95 py-3 backdrop-blur-md lg:top-[5.5rem]">
      <div className="no-scrollbar flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSalonSection(item.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active === item.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
