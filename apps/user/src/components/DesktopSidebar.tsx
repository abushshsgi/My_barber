import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Map, CalendarCheck, MessageSquare, Bell, User, Heart, Settings, Tag, Sparkles, Gift, Flame, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, key: "home" },
  { to: "/map", icon: Map, key: "map" },
  { to: "/bookings", icon: CalendarCheck, key: "bookings" },
  { to: "/chat", icon: MessageSquare, key: "chat" },
  { to: "/notifications", icon: Bell, key: "notifications" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

export function DesktopSidebar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-background px-6 py-8 lg:flex">
      <Link to="/" className="mb-10 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">mysaloon</span>
        <span className="text-sm font-bold text-muted-foreground">.uz</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-surface",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {t(`nav.${tab.key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
        <Link to="/today" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Flame className="h-5 w-5" /> Bugungi vaqtlar
        </Link>
        <Link to="/stylists" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Award className="h-5 w-5" /> Top ustalar
        </Link>
        <Link to="/explore" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Sparkles className="h-5 w-5" /> Trendlar
        </Link>
        <Link to="/offers" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Tag className="h-5 w-5" /> Aksiyalar
        </Link>
        <Link to="/loyalty" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Sparkles className="h-5 w-5" /> Bonus
        </Link>
        <Link to="/giftcard" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Gift className="h-5 w-5" /> Sovg'a karta
        </Link>
        <Link to="/favorites" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Heart className="h-5 w-5" /> Sevimlilar
        </Link>
        <Link to="/settings" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground hover:bg-surface">
          <Settings className="h-5 w-5" /> Sozlamalar
        </Link>
      </div>
    </aside>
  );
}
