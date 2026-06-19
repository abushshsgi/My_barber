import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CalendarCheck,
  Compass,
  Home,
  Map,
  Tag,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { isNavTabActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ShellProps = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
};

const MAIN_NAV = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/explore", key: "nav.explore", icon: Compass },
  { to: "/map", key: "nav.map", icon: Map },
  { to: "/today", key: "nav.today", icon: Calendar },
  { to: "/offers", key: "nav.offers", icon: Tag },
  { to: "/bookings", key: "nav.bookings", icon: CalendarCheck },
] as const;

function Main({ children, fullBleed, className }: ShellProps & { className?: string }) {
  return (
    <main
      className={cn(
        "flex-1",
        !fullBleed && "w-full px-6 pb-12 pt-6 xl:px-10 2xl:px-12",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function ShellBazaarClassic({
  children,
  notificationsUnread = 0,
  chatUnread = 0,
  fullBleed,
}: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex h-[4.25rem] w-full items-center gap-4 px-6 xl:px-10 2xl:px-12">
          <Link to="/" className="flex shrink-0 items-baseline gap-0.5">
            <span className="text-xl font-bold tracking-tight text-foreground">mysaloon</span>
            <span className="text-sm font-bold text-muted-foreground">.uz</span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {MAIN_NAV.map(({ to, key, icon: Icon }) => {
              const active = isNavTabActive(pathname, to);
              return (
                <Link
                  key={to}
                  to={to}
                  preload="intent"
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 2} />
                  <span suppressHydrationWarning>{t(key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <div className="hidden xl:block">
              <AudienceSwitch variant="compact" showProfileHint={false} />
            </div>
            <Link
              to="/notifications"
              className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface transition-colors hover:bg-surface/80"
              aria-label={t("nav.notifications")}
            >
              <Bell className="h-4 w-4" strokeWidth={2.2} />
              {notificationsUnread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                  {notificationsUnread > 9 ? "9+" : notificationsUnread}
                </span>
              ) : null}
            </Link>
            <Link
              to="/chat"
              className="relative hidden h-9 items-center justify-center rounded-full border border-border bg-surface px-3 text-[12px] font-bold text-foreground transition-colors hover:bg-surface/80 sm:flex"
            >
              {t("nav.chat")}
              {chatUnread > 0 ? (
                <span className="ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              ) : null}
            </Link>
            <Link
              to="/profile"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface/80"
              aria-label={t("nav.profile")}
            >
              <User className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-border/60 px-6 py-2 lg:hidden xl:px-10 2xl:px-12">
          {MAIN_NAV.map(({ to, key, icon: Icon }) => {
            const active = isNavTabActive(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold",
                  active ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </header>
      <Main fullBleed={fullBleed}>{children}</Main>
    </div>
  );
}
