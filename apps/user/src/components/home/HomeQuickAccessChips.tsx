import { Link } from "@tanstack/react-router";
import { CalendarCheck, Compass, Map, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

const chips = [
  { to: "/map", icon: Map, key: "map", labelKey: "nav.map" },
  { to: "/bookings", icon: CalendarCheck, key: "bookings", labelKey: "nav.bookings" },
  { to: "/explore", icon: Compass, key: "explore", labelKey: "nav.explore" },
  { to: "/offers", icon: Tag, key: "offers", labelKey: "nav.offers" },
] as const;

export function HomeQuickAccessChips() {
  const { t } = useTranslation();

  return (
    <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5">
      {chips.map(({ to, icon: Icon, labelKey }) => (
        <Link
          key={to}
          to={to}
          className="flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2.5 active:scale-[0.98] transition-transform"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-foreground text-background">
            <Icon className="size-4" strokeWidth={2.2} />
          </span>
          <span className="text-[12px] font-bold text-foreground">{t(labelKey)}</span>
        </Link>
      ))}
    </div>
  );
}
