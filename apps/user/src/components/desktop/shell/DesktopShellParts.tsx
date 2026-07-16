import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  Compass,
  Home,
  Map,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { DesktopHeaderActions } from "@/components/desktop/shell/DesktopHeaderActions";
import {
  DESKTOP_HEADER_HEIGHT_CLASS,
  DESKTOP_SHELL_INSET,
} from "@/lib/desktop-bazaar-layout";
import { isNavTabActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const HEADER_INSET_DEFAULT = DESKTOP_SHELL_INSET;

type ShellProps = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
  mainClassName?: string;
  headerInsetClassName?: string;
};

const MAIN_NAV = [
  { to: "/", key: "nav.home", icon: Home },
  { to: "/explore", key: "nav.explore", icon: Compass },
  { to: "/map", key: "nav.map", icon: Map },
  { to: "/today", key: "nav.today", icon: Calendar },
  { to: "/ai-style", key: "nav.aiStyle", icon: Sparkles },
  { to: "/bookings", key: "nav.bookings", icon: CalendarCheck },
] as const;

function Main({ children, fullBleed, className }: ShellProps & { className?: string }) {
  return (
    <main
      className={cn(
        "flex-1",
        fullBleed && "flex min-h-0 flex-col",
        !fullBleed && cn("w-full pb-12 pt-6", DESKTOP_SHELL_INSET),
        className,
      )}
    >
      {children}
    </main>
  );
}

export function DesktopAppHeader({
  notificationsUnread = 0,
  chatUnread = 0,
  headerInsetClassName = HEADER_INSET_DEFAULT,
}: {
  notificationsUnread?: number;
  chatUnread?: number;
  headerInsetClassName?: string;
}) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur-md">
      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-3 sm:gap-5",
          DESKTOP_HEADER_HEIGHT_CLASS,
          headerInsetClassName,
        )}
      >
        <Link to="/" className="flex shrink-0 items-center" aria-label="Mysaloon">
          <MysaloonLogo size="sm" imgClassName="rounded-xl sm:size-9" />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto lg:flex xl:gap-1">
          {MAIN_NAV.map(({ to, key, icon: Icon }) => {
            const active = isNavTabActive(pathname, to);
            const label = t(key);
            return (
              <Link
                key={to}
                to={to}
                preload="intent"
                aria-label={label}
                title={label}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors xl:gap-2 xl:px-3.5",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 2} />
                <span className="hidden xl:inline" suppressHydrationWarning>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 sm:gap-3.5">
          <div className="hidden xl:block">
            <AudienceSwitch variant="header" showProfileHint={false} />
          </div>
          <DesktopHeaderActions notificationsUnread={notificationsUnread} chatUnread={chatUnread} />
        </div>
      </div>

      <nav
        className={cn(
          "flex gap-1 overflow-x-auto border-t border-border/60 py-2 lg:hidden",
          headerInsetClassName,
        )}
      >
        {MAIN_NAV.map(({ to, key, icon: Icon }) => {
          const active = isNavTabActive(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold",
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
  );
}

export function ShellBazaarClassic({
  children,
  notificationsUnread = 0,
  chatUnread = 0,
  fullBleed,
  mainClassName,
  headerInsetClassName = HEADER_INSET_DEFAULT,
}: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DesktopAppHeader
        notificationsUnread={notificationsUnread}
        chatUnread={chatUnread}
        headerInsetClassName={headerInsetClassName}
      />
      <Main fullBleed={fullBleed} className={mainClassName}>
        {children}
      </Main>
    </div>
  );
}
