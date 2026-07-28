import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { scrollToSalonSection, type SalonSectionId } from "@/lib/salon-scroll";
import { cn } from "@/lib/utils";

export type { SalonSectionId };

type NavItem = { id: SalonSectionId; label: string };

export function SalonSectionNav({
  salon,
  variant = "desktop",
  infoOnly = false,
}: {
  salon: Salon;
  variant?: "desktop" | "mobile";
  /** Mobil: faqat haqida, qulayliklar, sharhlar, portfolio — xizmat/usta yo'q */
  infoOnly?: boolean;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SalonSectionId>("about");
  const isMobile = variant === "mobile";

  const items = useMemo((): NavItem[] => {
    const list: NavItem[] = [{ id: "about", label: t("salon.tabs.about") }];
    if (salon.amenities.length) list.push({ id: "amenities", label: t("salon.nav.amenities") });
    if (!infoOnly) {
      list.push({ id: "services", label: t("salon.tabs.services") });
      if (salon.staff.length) list.push({ id: "staff", label: t("salon.tabs.staff") });
    }
    list.push({ id: "reviews", label: t("salon.tabs.reviews") });
    if (!isMobile) {
      list.push({ id: "location", label: t("salon.nav.location") });
      if (salon.hours.length || salon.closedWeekdays.length) {
        list.push({ id: "hours", label: t("salon.hours.title") });
      }
    }
    if (salon.portfolio.length) list.push({ id: "portfolio", label: t("salon.tabs.portfolio") });
    return list;
  }, [salon, t, isMobile, infoOnly]);

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
    <nav
      className={cn(
        "sticky z-20 border-b border-border bg-background/95 backdrop-blur-md",
        isMobile ? "-mx-4 top-0 py-2.5" : "top-0 -mx-1 py-3 lg:top-[4.5rem]",
      )}
      style={isMobile ? { top: "env(safe-area-inset-top, 0px)" } : undefined}
    >
      <div
        className={cn(
          "no-scrollbar flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          isMobile ? "px-4" : "px-1",
        )}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSalonSection(item.id)}
            className={cn(
              "shrink-0 rounded-full font-semibold transition-colors",
              isMobile ? "px-3.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
              active === item.id
                ? "bg-foreground text-background"
                : isMobile
                  ? "bg-muted/60 text-muted-foreground active:bg-muted"
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
