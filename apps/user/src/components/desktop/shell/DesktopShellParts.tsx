import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Compass,
  Home,
  Map,
  MessageSquare,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { DesktopSearchBar } from "@/components/desktop/ui/DesktopSearchBar";
import { cn } from "@/lib/utils";

type NavItem = { to: string; labelKey: string; icon: React.ComponentType<{ className?: string }> };

const MAIN_NAV: NavItem[] = [
  { to: "/explore", labelKey: "nav.explore", icon: Compass },
  { to: "/map", labelKey: "nav.map", icon: Map },
  { to: "/today", labelKey: "nav.today", icon: Calendar },
  { to: "/offers", labelKey: "nav.offers", icon: Tag },
];

type ShellProps = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
};

export function ShellMarketplace({ children, chatUnread = 0, notificationsUnread = 0, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-8">
          <Link to="/" className="shrink-0 text-lg font-bold tracking-tight">
            mysaloon
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            {MAIN_NAV.map(({ to, labelKey, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(`${to}/`);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-colors",
                    active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey, { defaultValue: labelKey })}
                </Link>
              );
            })}
          </nav>
          <div className="mx-auto hidden max-w-xl flex-1 lg:block">
            <DesktopSearchBar value="" onChange={() => {}} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <AudienceSwitch />
            <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-surface">
              <Bell className="h-4 w-4" />
              {notificationsUnread > 0 ? (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-foreground" />
              ) : null}
            </Link>
            <Link to="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background">
              <User className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className={cn("flex-1", !fullBleed && "mx-auto w-full max-w-[1440px] px-8 pb-24 pt-6")}>
        {children}
      </main>
    </div>
  );
}

const RAIL_ITEMS = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/map", labelKey: "nav.map", icon: Map },
  { to: "/bookings", labelKey: "nav.bookings", icon: Calendar },
  { to: "/chat", labelKey: "nav.chat", icon: MessageSquare },
  { to: "/profile", labelKey: "nav.profile", icon: User },
];

const DISCOVERY_SUB = [
  { to: "/explore", labelKey: "nav.explore" },
  { to: "/today", labelKey: "nav.today" },
  { to: "/offers", labelKey: "nav.offers" },
  { to: "/ai-style", labelKey: "homePage.quick.aiStyle" },
];

const ACCOUNT_SUB = [
  { to: "/wallet", labelKey: "nav.wallet" },
  { to: "/favorites", labelKey: "nav.favorites" },
  { to: "/settings", labelKey: "nav.settings" },
];

export function ShellDashboard({ children, chatUnread = 0, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface/40 py-4">
        {RAIL_ITEMS.map(({ to, labelKey, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
          const badge = to === "/chat" && chatUnread > 0;
          return (
            <Link
              key={to}
              to={to}
              title={t(labelKey, { defaultValue: labelKey })}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-xl transition-colors",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {badge ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </aside>
      <aside className="hidden w-[200px] shrink-0 border-r border-border bg-background py-6 lg:block">
        <p className="px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("homePage.discovery", { defaultValue: "Kashfiyot" })}
        </p>
        <nav className="mt-2 space-y-0.5 px-2">
          {DISCOVERY_SUB.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-bold",
                pathname === to ? "bg-surface" : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
              )}
            >
              {t(labelKey, { defaultValue: labelKey })}
            </Link>
          ))}
        </nav>
        <p className="mt-6 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("homePage.account", { defaultValue: "Hisob" })}
        </p>
        <nav className="mt-2 space-y-0.5 px-2">
          {ACCOUNT_SUB.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-bold",
                pathname === to ? "bg-surface" : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
              )}
            >
              {t(labelKey, { defaultValue: labelKey })}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur-md">
          <DesktopSearchBar value="" onChange={() => {}} className="max-w-md" />
          <AudienceSwitch />
        </header>
        <main className={cn("flex-1", !fullBleed && "px-6 pb-24 pt-6")}>{children}</main>
      </div>
    </div>
  );
}

const EDITORIAL_NAV = [
  { to: "/explore", labelKey: "nav.explore" },
  { to: "/map", labelKey: "nav.map" },
  { to: "/today", labelKey: "nav.today" },
  { to: "/offers", labelKey: "nav.offers" },
];

export function ShellEditorial({ children, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-8">
          <Link to="/" className="text-xl font-bold tracking-tight">
            mysaloon
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {EDITORIAL_NAV.map(({ to, labelKey }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "text-sm font-bold tracking-wide",
                  pathname === to ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(labelKey, { defaultValue: labelKey })}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <AudienceSwitch />
            <Link
              to="/today"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background"
            >
              {t("salon.bookNow", { defaultValue: "Bron qilish" })}
            </Link>
          </div>
        </div>
      </header>
      <main className={cn("flex-1", !fullBleed && "mx-auto w-full max-w-[1440px] px-8 pb-24 pt-8")}>
        {children}
      </main>
    </div>
  );
}
