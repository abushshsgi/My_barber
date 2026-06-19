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
import { BAZAAR_GREEN } from "@/lib/desktop-variant";
import { cn } from "@/lib/utils";

type ShellProps = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
};

const NAV = [
  { to: "/explore", key: "nav.explore", icon: Compass },
  { to: "/map", key: "nav.map", icon: Map },
  { to: "/today", key: "nav.today", icon: Calendar },
  { to: "/offers", key: "nav.offers", icon: Tag },
] as const;

function Main({ children, fullBleed, className }: ShellProps & { className?: string }) {
  return (
    <main className={cn("flex-1", !fullBleed && "mx-auto w-full max-w-[1440px] px-8 pb-12 pt-6", className)}>
      {children}
    </main>
  );
}

export function ShellBazaarClassic({ children, notificationsUnread = 0, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-8">
          <Link to="/" className="flex items-center gap-2 font-bold" style={{ color: BAZAAR_GREEN }}>
            <LayoutGrid className="h-5 w-5" />
            mysaloon
          </Link>
          <div className="hidden flex-1 md:block">
            <DesktopSearchBar value="" onChange={() => {}} />
          </div>
          <AudienceSwitch />
          <Link to="/notifications" className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-surface">
            <Bell className="h-4 w-4" />
            {notificationsUnread > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /> : null}
          </Link>
          <Link to="/map" className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: BAZAAR_GREEN }}>
            {t("nav.map")}
          </Link>
        </div>
        <div className="border-t border-border/60 bg-white">
          <div className="mx-auto flex max-w-[1440px] gap-6 overflow-x-auto px-8 py-2.5 text-sm font-medium">
            {NAV.map(({ to, key, icon: Icon }) => (
              <Link key={to} to={to} className="flex shrink-0 items-center gap-1.5 text-muted-foreground hover:text-[#059669]">
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
