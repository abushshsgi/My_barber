import { Link } from "@tanstack/react-router";
import { CalendarCheck, Map, MessageSquare, Tag, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const ACTIONS: { to: string; icon: LucideIcon; labelKey: string }[] = [
  { to: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { to: "/map", icon: Map, labelKey: "nav.map" },
  { to: "/offers", icon: Tag, labelKey: "profile.offers" },
  { to: "/bookings", icon: CalendarCheck, labelKey: "nav.bookings" },
];

export function ProfileQuickActions() {
  const { t } = useTranslation();

  return (
    <section className="mt-6 px-5">
      <h2 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t("profile.variant4.quickActions")}
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {ACTIONS.map(({ to, icon: Icon, labelKey }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background py-3.5 active:scale-[0.97] active:bg-surface transition-transform"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-surface">
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <span className="text-center text-[10px] font-bold leading-tight">{t(labelKey)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
