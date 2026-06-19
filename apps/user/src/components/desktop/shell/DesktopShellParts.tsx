import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Compass,
  Home,
  LayoutGrid,
  Map,
  MessageSquare,
  Search,
  Tag,
  User,
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
  { to: "/explore", key: "nav.explore", icon: Compass },
  { to: "/map", key: "nav.map", icon: Map },
  { to: "/today", key: "nav.today", icon: Calendar },
  { to: "/offers", key: "nav.offers", icon: Tag },
] as const;

function ShellMain({ children, fullBleed, className }: ShellProps & { className?: string }) {
  return (
    <main className={cn("flex-1", !fullBleed && "mx-auto w-full max-w-[1440px] px-8 pb-28 pt-8", className)}>
      {children}
    </main>
  );
}

/** Voyage — Airbnb: oq header, underline nav, qizil logo */
export function ShellVoyage({ children, notificationsUnread = 0, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background shadow-sm">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-6 px-8">
          <Link to="/" className="text-xl font-bold text-[#E61E4D]">
            mysaloon
          </Link>
          <nav className="hidden flex-1 justify-center gap-8 md:flex">
            {NAV.map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "border-b-2 py-6 text-sm font-semibold",
                  pathname === to ? "border-[#E61E4D] text-foreground" : "border-transparent text-muted-foreground",
                )}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <AudienceSwitch />
            <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface">
              <Bell className="h-5 w-5" />
              {notificationsUnread > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#E61E4D]" /> : null}
            </Link>
            <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-full border border-border">
              <User className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      <ShellMain fullBleed={fullBleed}>{children}</ShellMain>
    </div>
  );
}

/** Reserve — Booking.com: to'liq ko'k header */
export function ShellReserve({ children, notificationsUnread = 0, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f5]">
      <header className="sticky top-0 z-40 bg-[#003580] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-8">
          <Link to="/" className="text-lg font-bold tracking-tight">
            mysaloon<span className="font-normal text-white/70">.com</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  pathname === to ? "bg-[#004a9e]" : "hover:bg-[#004a9e]/60",
                )}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-white/80 lg:inline">UZS</span>
            <Link to="/notifications" className="grid h-9 w-9 place-items-center rounded-sm hover:bg-white/10">
              <Bell className="h-4 w-4" />
            </Link>
            <Link to="/profile" className="rounded-md border border-white/40 px-4 py-1.5 text-sm font-semibold hover:bg-white/10">
              {t("profile.title", { defaultValue: "Hisob" })}
            </Link>
          </div>
        </div>
      </header>
      <ShellMain fullBleed={fullBleed} className={cn(!fullBleed && "pt-6")}>
        {children}
      </ShellMain>
    </div>
  );
}

/** Atelier — Magazine: minimal, markaziy nav, katta whitespace */
export function ShellAtelier({ children, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7]">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#faf9f7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8">
          <Link to="/" className="font-serif text-2xl font-light tracking-[0.2em] uppercase">
            Mysaloon
          </Link>
          <nav className="hidden items-center gap-10 md:flex">
            {NAV.map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "text-xs font-medium uppercase tracking-[0.18em]",
                  pathname === to ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <Link to="/today" className="text-xs font-medium uppercase tracking-[0.18em] underline underline-offset-4">
            {t("salon.bookNow")}
          </Link>
        </div>
      </header>
      <ShellMain fullBleed={fullBleed} className={cn(!fullBleed && "pt-10")}>
        {children}
      </ShellMain>
    </div>
  );
}

const RAIL = [
  { to: "/", icon: Home },
  { to: "/map", icon: Map },
  { to: "/bookings", icon: Calendar },
  { to: "/chat", icon: MessageSquare },
  { to: "/profile", icon: User },
] as const;

/** Hub — Linear: qora icon rail + yengil top bar */
export function ShellHub({ children, chatUnread = 0, fullBleed }: ShellProps) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-border bg-neutral-950 py-4">
        {RAIL.map(({ to, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const badge = to === "/chat" && chatUnread > 0;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-lg text-neutral-400 transition-colors",
                active && "bg-neutral-800 text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {badge ? (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
              ) : null}
            </Link>
          );
        })}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-4 border-b border-border px-6">
          <DesktopSearchBar value="" onChange={() => {}} className="max-w-sm" />
          <span className="text-xs text-muted-foreground">⌘K</span>
          <div className="ml-auto">
            <AudienceSwitch />
          </div>
        </header>
        <main className={cn("flex-1", !fullBleed && "px-6 pb-28 pt-6")}>{children}</main>
      </div>
    </div>
  );
}

/** Bazaar — filter + qidiruv ikki qatorli header */
export function ShellBazaar({ children, fullBleed }: ShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-4 px-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-[#059669]">
            <LayoutGrid className="h-5 w-5" />
            mysaloon
          </Link>
          <div className="hidden flex-1 md:block">
            <DesktopSearchBar value="" onChange={() => {}} />
          </div>
          <AudienceSwitch />
          <Link to="/map" className="flex items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-2 text-sm font-bold text-white">
            <Map className="h-4 w-4" />
            {t("nav.map")}
          </Link>
        </div>
        <div className="border-t border-border bg-surface/40">
          <div className="mx-auto flex max-w-[1440px] gap-4 overflow-x-auto px-8 py-2 text-sm font-medium">
            {NAV.map(({ to, key, icon: Icon }) => (
              <Link key={to} to={to} className="flex shrink-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Icon className="h-3.5 w-3.5" />
                {t(key)}
              </Link>
            ))}
            <Link to="/ai-style" className="flex shrink-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <Search className="h-3.5 w-3.5" />
              AI Style
            </Link>
          </div>
        </div>
      </header>
      <ShellMain fullBleed={fullBleed}>{children}</ShellMain>
    </div>
  );
}
