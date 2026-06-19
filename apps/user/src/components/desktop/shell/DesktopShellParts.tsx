import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Compass,
  LayoutGrid,
  Map,
  Search,
  Tag,
  User,
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
    <main className={cn("flex-1", !fullBleed && "mx-auto w-full max-w-[1440px] px-8 pb-28 pt-6", className)}>
      {children}
    </main>
  );
}

/** Classic — ikki qatorli header + nav */
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

/** Spread — bitta qator, keng qidiruv */
export function ShellBazaarSpread({ children, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-8">
          <Link to="/" className="shrink-0 text-lg font-bold" style={{ color: BAZAAR_GREEN }}>
            mysaloon
          </Link>
          <div className="flex-1">
            <DesktopSearchBar value="" onChange={() => {}} large />
          </div>
          <AudienceSwitch />
          <Link to="/profile" className="grid h-10 w-10 place-items-center rounded-full border border-border">
            <User className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <Main fullBleed={fullBleed} className="pt-8">{children}</Main>
    </div>
  );
}

/** Horizon — yashil header bar */
export function ShellBazaarHorizon({ children, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f5]">
      <header className="sticky top-0 z-40 text-white shadow-md" style={{ backgroundColor: BAZAAR_GREEN }}>
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-8">
          <Link to="/" className="text-lg font-bold">mysaloon</Link>
          <nav className="hidden gap-6 md:flex">
            {NAV.map(({ to, key }) => (
              <Link key={to} to={to} className={cn("text-sm font-medium", pathname === to ? "underline underline-offset-4" : "text-white/85 hover:text-white")}>
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <AudienceSwitch />
            <Link to="/map" className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold hover:bg-white/30">
              {t("common.viewMap")}
            </Link>
          </div>
        </div>
      </header>
      <Main fullBleed={fullBleed}>{children}</Main>
    </div>
  );
}

/** Atlas — xarita markazda, qidiruv keng */
export function ShellBazaarAtlas({ children, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-8">
          <Link to="/" className="font-bold" style={{ color: BAZAAR_GREEN }}>mysaloon</Link>
          <span className="text-muted-foreground">|</span>
          <Link to="/map" className="flex items-center gap-1.5 text-sm font-semibold hover:underline">
            <Map className="h-4 w-4" style={{ color: BAZAAR_GREEN }} />
            {t("nav.map")}
          </Link>
          <div className="mx-auto hidden max-w-md flex-1 lg:block">
            <DesktopSearchBar value="" onChange={() => {}} />
          </div>
          <AudienceSwitch />
          <Link to="/today" className="text-sm font-bold" style={{ color: BAZAAR_GREEN }}>
            {t("homePage.quick.today")}
          </Link>
        </div>
      </header>
      <Main fullBleed={fullBleed}>{children}</Main>
    </div>
  );
}

/** Luxe — baland header, premium */
export function ShellBazaarLuxe({ children, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b-2 bg-white" style={{ borderColor: BAZAAR_GREEN }}>
        <div className="mx-auto max-w-[1440px] px-8 py-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold tracking-tight" style={{ color: BAZAAR_GREEN }}>
              mysaloon
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/explore" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                {t("nav.explore")}
              </Link>
              <Link to="/map" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                {t("nav.map")}
              </Link>
              <AudienceSwitch />
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("homePage.editorialTagline")}</p>
        </div>
      </header>
      <Main fullBleed={fullBleed} className="pt-8">{children}</Main>
    </div>
  );
}
