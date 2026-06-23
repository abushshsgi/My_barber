import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  Compass,
  Home,
  Map,
  Tag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { DesktopHeaderActions } from "@/components/desktop/shell/DesktopHeaderActions";
import { isNavTabActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ShellProps = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
  mainClassName?: string;
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
        fullBleed && "flex min-h-0 flex-col",
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
  mainClassName,
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

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div className="hidden xl:block">
              <AudienceSwitch variant="header" showProfileHint={false} />
            </div>
            <DesktopHeaderActions
              notificationsUnread={notificationsUnread}
              chatUnread={chatUnread}
            />
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
      <Main fullBleed={fullBleed} className={mainClassName}>{children}</Main>
    </div>
  );
}
