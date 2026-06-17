import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  Film,
  Flame,
  Gift,
  GitCompareArrows,
  Heart,
  Home,
  Map,
  MessageSquare,
  Settings,
  Sparkles,
  Tag,
  User,
  Wallet,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { isNavTabActive } from "@/lib/navigation";

const tabs = [
  { to: "/", icon: Home, key: "home" },
  { to: "/map", icon: Map, key: "map" },
  { to: "/bookings", icon: CalendarCheck, key: "bookings" },
  { to: "/chat", icon: MessageSquare, key: "chat", badgeKey: "chat" as const },
  { to: "/notifications", icon: Bell, key: "notifications", badgeKey: "notifications" as const },
  { to: "/profile", icon: User, key: "profile" },
] as const;

const moreLinks = [
  { to: "/today", icon: Flame, labelKey: "home.quick.today" },
  { to: "/reels", icon: Film, labelKey: "home.quick.reels" },
  { to: "/ai-style", icon: Wand2, labelKey: "home.quick.aiStyle" },
  { to: "/wallet", icon: Wallet, labelKey: "nav.wallet" },
  { to: "/compare", icon: GitCompareArrows, labelKey: "home.quick.compare" },
  { to: "/explore", icon: Sparkles, labelKey: "home.quick.trends" },
  { to: "/offers", icon: Tag, labelKey: "home.quick.offers" },
  { to: "/loyalty", icon: Sparkles, labelKey: "profile.loyalty" },
  { to: "/giftcard", icon: Gift, labelKey: "profile.giftcard" },
] as const;

type Props = {
  chatUnread?: number;
  notificationsUnread?: number;
};

function NavBadge({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold",
        active ? "bg-background text-foreground" : "bg-foreground text-background",
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function DesktopSidebar({ chatUnread = 0, notificationsUnread = 0 }: Props) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => isNavTabActive(pathname, to);
  const moreActive = moreLinks.some((link) => isActive(link.to));
  const [moreOpen, setMoreOpen] = useState(moreActive);

  useEffect(() => {
    if (moreActive) setMoreOpen(true);
  }, [moreActive]);

  const badgeFor = (key?: "chat" | "notifications") => {
    if (key === "chat") return chatUnread;
    if (key === "notifications") return notificationsUnread;
    return 0;
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-background px-6 py-8 lg:flex">
      <Link to="/" className="mb-8 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">mysaloon</span>
        <span className="text-sm font-bold text-muted-foreground">.uz</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.to);
          const badge = badgeFor(tab.badgeKey);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              preload="intent"
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-surface",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
              <span className="min-w-0 flex-1 truncate" suppressHydrationWarning>
                {t(`nav.${tab.key}`)}
              </span>
              <NavBadge count={badge} active={active} />
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors",
            moreActive ? "bg-surface text-foreground" : "text-foreground hover:bg-surface",
          )}
          aria-expanded={moreOpen}
        >
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 transition-transform", moreOpen && "rotate-180")}
            strokeWidth={2.2}
          />
          <span suppressHydrationWarning>{t("nav.more", { defaultValue: "Ko'proq" })}</span>
        </button>

        {moreOpen ? (
          <div className="mt-1 flex flex-col gap-0.5">
            {moreLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  preload="intent"
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-2.5 pl-8 text-sm font-semibold transition-colors",
                    active ? "bg-surface text-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span suppressHydrationWarning>{t(link.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        <Link
          to="/favorites"
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors",
            isActive("/favorites") ? "bg-surface text-foreground" : "text-foreground hover:bg-surface",
          )}
        >
          <Heart className="h-5 w-5" strokeWidth={2} />
          <span suppressHydrationWarning>{t("profile.favorites")}</span>
        </Link>
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors",
            isActive("/settings") ? "bg-surface text-foreground" : "text-foreground hover:bg-surface",
          )}
        >
          <Settings className="h-5 w-5" strokeWidth={2} />
          <span suppressHydrationWarning>{t("profile.settings")}</span>
        </Link>
      </div>
    </aside>
  );
}
