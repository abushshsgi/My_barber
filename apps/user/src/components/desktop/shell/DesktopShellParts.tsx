import { Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Compass,
  LayoutGrid,
  Map,
  Tag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { DesktopSearchBar } from "@/components/desktop/ui/DesktopSearchBar";
import { cn } from "@/lib/utils";

type ShellProps = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
};

const NAV = [
  { to: "/explore", key: "homePage.quick.trends", icon: Compass },
  { to: "/map", key: "nav.map", icon: Map },
  { to: "/today", key: "nav.today", icon: Calendar },
  { to: "/offers", key: "homePage.quick.offers", icon: Tag },
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

export function ShellBazaarClassic({ children, notificationsUnread = 0, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex h-14 w-full items-center gap-4 px-6 xl:px-10 2xl:px-12">
          <Link to="/" className="flex items-center gap-2 font-bold text-foreground">
            <LayoutGrid className="h-5 w-5" />
            mysaloon
          </Link>
          <div className="hidden min-w-0 flex-1 md:block md:max-w-2xl lg:max-w-3xl">
            <DesktopSearchBar value="" onChange={() => {}} />
          </div>
          <AudienceSwitch />
          <Link to="/notifications" className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-surface">
            <Bell className="h-4 w-4" />
            {notificationsUnread > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /> : null}
          </Link>
          <Link to="/map" className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">
            {t("nav.map")}
          </Link>
        </div>
        <div className="border-t border-border/60">
          <div className="flex w-full gap-6 overflow-x-auto px-6 py-2.5 text-sm font-medium xl:px-10 2xl:px-12">
            {NAV.map(({ to, key, icon: Icon }) => (
              <Link key={to} to={to} className="flex shrink-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Icon className="h-3.5 w-3.5" />
                {t(key)}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <Main fullBleed={fullBleed}>{children}</Main>
    </div>
  );
}
