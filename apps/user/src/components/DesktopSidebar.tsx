import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck,
  Film,
  Flame,
  Gift,
  GitCompareArrows,
  Heart,
  Home,
  Map,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Tag,
  User,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDisplayUser } from "@/hooks/use-me";
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

const discoveryLinks = [
  { to: "/today", icon: Flame, labelKey: "home.quick.today" },
  { to: "/explore", icon: Sparkles, labelKey: "home.quick.trends" },
  { to: "/offers", icon: Tag, labelKey: "home.quick.offers" },
  { to: "/compare", icon: GitCompareArrows, labelKey: "home.quick.compare" },
  { to: "/ai-style", icon: Wand2, labelKey: "home.quick.aiStyle" },
  { to: "/reels", icon: Film, labelKey: "home.quick.reels" },
] as const;

const accountLinks = [
  { to: "/wallet", icon: Wallet, labelKey: "nav.wallet" },
  { to: "/giftcard", icon: Gift, labelKey: "profile.giftcard" },
  { to: "/loyalty", icon: Sparkles, labelKey: "profile.loyalty" },
  { to: "/favorites", icon: Heart, labelKey: "profile.favorites" },
  { to: "/account/household", icon: Users, labelKey: "settings.sections.household" },
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

function SidebarLink({
  to,
  icon: Icon,
  label,
  active,
  indent,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      to={to}
      preload="intent"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors",
        indent && "pl-6",
        active ? "bg-surface text-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="min-w-0 truncate" suppressHydrationWarning>
        {label}
      </span>
    </Link>
  );
}

export function DesktopSidebar({ chatUnread = 0, notificationsUnread = 0 }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useDisplayUser();
  const [searchQuery, setSearchQuery] = useState("");
  const isActive = (to: string) => isNavTabActive(pathname, to);

  const badgeFor = (key?: "chat" | "notifications") => {
    if (key === "chat") return chatUnread;
    if (key === "notifications") return notificationsUnread;
    return 0;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      void navigate({ to: "/map", search: { q } });
    } else {
      void navigate({ to: "/" });
    }
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-border bg-background px-4 py-6 lg:flex">
      <Link to="/" className="mb-5 flex items-baseline gap-1 px-2">
        <span className="text-2xl font-bold tracking-tight">mysaloon</span>
        <span className="text-sm font-bold text-muted-foreground">.uz</span>
      </Link>

      <form onSubmit={handleSearch} className="mb-5 px-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("common.search")}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
          />
        </div>
      </form>

      <nav className="flex flex-col gap-0.5 overflow-y-auto px-1">
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-surface",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
              <span className="min-w-0 flex-1 truncate" suppressHydrationWarning>
                {t(`nav.${tab.key}`)}
              </span>
              <NavBadge count={badge} active={active} />
            </Link>
          );
        })}

        <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("nav.discovery", { defaultValue: "Kashf etish" })}
        </p>
        {discoveryLinks.map((link) => (
          <SidebarLink
            key={link.to}
            to={link.to}
            icon={link.icon}
            label={t(link.labelKey)}
            active={isActive(link.to)}
          />
        ))}

        <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("nav.account", { defaultValue: "Hisob" })}
        </p>
        {accountLinks.map((link) => (
          <SidebarLink
            key={link.to}
            to={link.to}
            icon={link.icon}
            label={t(link.labelKey)}
            active={isActive(link.to)}
          />
        ))}
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:opacity-80">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.phone}</p>
            </div>
          </Link>
          <Link
            to="/settings"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-surface"
            aria-label={t("profile.settings")}
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
