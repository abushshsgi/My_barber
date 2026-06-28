import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  MessageSquare,
  Star,
  UserCog,
  Bell,
  Search,
  Command as CommandIcon,
  LogOut,
  ChevronRight,
  Menu,
  Building2,
  Images,
  ArrowLeftRight,
  Scissors,
  Wallet,
  BarChart3,
  LineChart,
  Megaphone,
  Settings,
  HelpCircle,
  CalendarDays,
  Package,
  Receipt,
  ImageIcon,
  Target,
  Sparkles,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { clearBarberTokens } from "@/lib/api";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RealtimeStatusBadge } from "@/components/barber/RealtimeStatusBadge";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBarberContext, type ViewMode } from "./BarberContext";
import { UserAvatar } from "./primitives";
import {
  getCapabilities,
  getFlowMeta,
  pathAllowedInSalonWorkspace,
  QUICK_ACTIONS,
  getWorkspaceLabel,
  NAV_CONFIG,
  type NavItem as MatrixNavItem,
} from "@/lib/barber-flow-config";
import {
  isBarberNavAllowedDuringActivation,
  isBarberPathAllowedDuringActivation,
} from "@/lib/barber-activation-gate";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
};

const ICON_BY_NAME: Record<MatrixNavItem["iconName"], NavItem["icon"]> = {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Users,
  MessageSquare,
  Bell,
  Star,
  Scissors,
  Clock,
  ImageIcon,
  Wallet,
  Receipt,
  Package,
  BarChart3,
  LineChart,
  Megaphone,
  Target,
  UserCog,
  Settings,
  HelpCircle,
  Building2,
  Images,
  Sparkles,
};

function mapNav(items: MatrixNavItem[]): NavItem[] {
  return items.map((item) => ({
    to: item.to,
    label: item.label,
    group: item.group,
    icon: ICON_BY_NAME[item.iconName],
  }));
}

function isBarberNavActive(pathname: string, itemTo: string): boolean {
  if (itemTo === "/barber") return pathname === "/barber";
  if (itemTo === "/barber/stats") {
    return pathname === "/barber/stats" || pathname === "/barber/stats/";
  }
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`);
}

function switchWorkspace(
  next: ViewMode,
  setViewMode: (v: ViewMode) => void,
  navigate: ReturnType<typeof useNavigate>,
) {
  flushSync(() => {
    setViewMode(next);
  });
  void navigate({ to: next === "salon" ? "/barber/salon-view" : "/barber" });
}

function Sidebar({
  nav,
  navAnimationKey,
  onNavigate,
}: {
  nav: NavItem[];
  navAnimationKey: string;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { viewMode, setViewMode, hasSalon, onboardingComplete, ownsSalon, profile, fullyReady } =
    useBarberContext();

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
          <Scissors className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="font-heading font-semibold text-sidebar-primary text-sm leading-tight">
            ShearHQ
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">Barber Panel</div>
        </div>
      </div>

      {/* Mode switch — faqat salon egasi */}
      {ownsSalon && hasSalon && onboardingComplete && (
        <div className="p-3 border-b border-sidebar-border">
          <button
            type="button"
            onClick={() => {
              const next = viewMode === "independent" ? "salon" : "independent";
              switchWorkspace(next, setViewMode, navigate);
              onNavigate?.();
            }}
            className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm hover:bg-foreground hover:text-background transition-colors duration-150"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeftRight className="size-3.5" />
              {viewMode === "independent" ? "Salon sahifasi" : "Barber kabineti"}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-70">{viewMode}</span>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
        <div className="space-y-4">
            {(() => {
              const groups = nav.reduce<Record<string, NavItem[]>>((acc, item) => {
                const g = item.group ?? "—";
                (acc[g] ??= []).push(item);
                return acc;
              }, {});
              const order = Object.keys(groups);
              return order.map((g) => (
                <div key={`${navAnimationKey}-${g}`} className="last:mb-0">
                  {g !== "—" && (
                    <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                      {g}
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {groups[g].map((item) => {
                      const Icon = item.icon;
                      const active =
                        item.to === "/barber"
                          ? pathname === "/barber"
                          : isBarberNavActive(pathname, item.to);
                      const locked =
                        !fullyReady && !isBarberNavAllowedDuringActivation(item.to);
                      return (
                        <div key={item.to}>
                          <Link
                            to={item.to}
                            onClick={(e) => {
                              if (locked) {
                                e.preventDefault();
                                return;
                              }
                              if (
                                ownsSalon &&
                                item.to.startsWith("/barber/salon-view") &&
                                viewMode !== "salon"
                              ) {
                                flushSync(() => setViewMode("salon"));
                              }
                              if (
                                ownsSalon &&
                                !item.to.startsWith("/barber/salon-view") &&
                                item.to !== "/barber/amenities" &&
                                viewMode === "salon" &&
                                !pathAllowedInSalonWorkspace(item.to, false)
                              ) {
                                flushSync(() => setViewMode("independent"));
                              }
                              onNavigate?.();
                            }}
                            aria-disabled={locked}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                              active
                                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              locked && "pointer-events-none opacity-35",
                            )}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
        </div>
      </nav>

      {/* Profile card */}
      <div className="p-3 border-t border-sidebar-border">
        <Link
          to="/barber/profile"
          onClick={!fullyReady ? (e) => e.preventDefault() : onNavigate}
          aria-disabled={!fullyReady}
          className={cn(
            "flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors",
            !fullyReady && "pointer-events-none opacity-35",
          )}
        >
          <UserAvatar
            src={profile.avatar}
            name={profile.name}
            className="size-9 ring-1 ring-sidebar-border"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-sidebar-primary truncate">{profile.name}</div>
            <div className="text-xs text-muted-foreground truncate">{profile.title}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function Topbar({
  nav,
  onMobileMenu,
  onCommandOpen,
}: {
  nav: NavItem[];
  onMobileMenu: () => void;
  onCommandOpen: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { notifications, profile, viewMode, isJoinedWorker, setViewMode, flowIdentity, fullyReady } =
    useBarberContext();
  useBookingLiveSync();
  const unread = notifications.filter((n) => !n.read).length;

  const currentItem =
    nav.find((i) => pathname === i.to || (i.to !== "/barber" && pathname.startsWith(i.to + "/"))) ??
    nav[0];

  const onSalonViewArea = pathname.startsWith("/barber/salon-view");
  const flowMeta = getFlowMeta(flowIdentity);

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenu}>
          <Menu className="size-5" />
        </Button>
        <div className="hidden sm:flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-muted-foreground">
              {getWorkspaceLabel({ isJoinedWorker, viewMode })}
            </span>
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            <span className="font-medium text-foreground truncate">{currentItem.label}</span>
          </div>
          <span className="text-[11px] text-muted-foreground truncate">
            {flowMeta.heroSubtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {fullyReady ? <RealtimeStatusBadge /> : null}
        {isJoinedWorker && fullyReady && !onSalonViewArea && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex shrink-0"
            onClick={() => {
              switchWorkspace("salon", setViewMode, navigate);
            }}
          >
            <Building2 className="size-3.5" />
            Salon ish maydoni
          </Button>
        )}
        {isJoinedWorker && fullyReady && onSalonViewArea && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex shrink-0"
            onClick={() => {
              switchWorkspace("independent", setViewMode, navigate);
            }}
          >
            <LayoutDashboard className="size-3.5" />
            Shaxsiy ish maydoni
          </Button>
        )}

        <button
          onClick={fullyReady ? onCommandOpen : undefined}
          disabled={!fullyReady}
          className={cn(
            "hidden md:inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm text-muted-foreground",
            !fullyReady && "pointer-events-none opacity-40",
          )}
        >
          <Search className="size-3.5" />
          <span>Qidirish</span>
          <kbd className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">
            <CommandIcon className="size-2.5" />K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          disabled={!fullyReady}
          onClick={onCommandOpen}
        >
          <Search className="size-4" />
        </Button>

        {fullyReady ? (
          <Link
            to="/barber/notifications"
            className="relative inline-flex items-center justify-center size-9 rounded-md hover:bg-accent transition-colors"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-foreground ring-2 ring-background" />
            )}
          </Link>
        ) : (
          <span
            className="relative inline-flex size-9 items-center justify-center rounded-md opacity-35"
            aria-hidden
          >
            <Bell className="size-4" />
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="size-9 rounded-full overflow-hidden ring-1 ring-border flex items-center justify-center"
            >
              <UserAvatar src={profile.avatar} name={profile.name} className="size-full min-h-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{profile.name}</div>
              <div className="text-xs text-muted-foreground font-normal">{profile.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {fullyReady ? (
              <>
                <DropdownMenuItem onClick={() => navigate({ to: "/barber/profile" })}>
                  <UserCog className="size-4 mr-2" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/barber/settings" })}>
                  <Settings className="size-4 mr-2" />
                  Sozlamalar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/barber/help" })}>
                  <HelpCircle className="size-4 mr-2" />
                  Yordam
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                clearBarberTokens();
                navigate({ to: "/auth" });
                toast.info("Tizimdan chiqildi");
              }}
            >
              <LogOut className="size-4 mr-2" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  nav,
  capability,
  flowIdentity,
  fullyReady,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nav: NavItem[];
  capability: "independentBase" | "salonOwner" | "salonWorker";
  flowIdentity: "owner" | "employee" | "mybarber" | "independent" | "unknown";
  fullyReady: boolean;
}) {
  const navigate = useNavigate();
  const { viewMode } = useBarberContext();
  const go = (to: string) => {
    if (!fullyReady && !isBarberNavAllowedDuringActivation(to)) return;
    onOpenChange(false);
    navigate({ to });
  };
  const quickActionsAll = QUICK_ACTIONS[flowIdentity];
  const quickActions = (
    viewMode === "salon"
      ? quickActionsAll.filter((a) =>
          pathAllowedInSalonWorkspace(a.to, capability === "salonWorker"),
        )
      : quickActionsAll
  ).filter((a) => fullyReady || isBarberNavAllowedDuringActivation(a.to));
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Sahifa yoki amalni qidiring..." />
      <CommandList>
        <CommandEmpty>Hech narsa topilmadi.</CommandEmpty>
        <CommandGroup heading="Tezkor amallar">
          {quickActions.map((action) => {
            const Icon = ICON_BY_NAME[action.iconName];
            return (
              <CommandItem key={action.to} onSelect={() => go(action.to)}>
                <Icon className="size-4 mr-2" />
                {action.label}
              </CommandItem>
            );
          })}
          {capability !== "independentBase" && (
            <CommandItem
              onSelect={() =>
                go(
                  capability === "salonWorker"
                    ? "/barber/salon-view/members"
                    : "/barber/salon-view/team",
                )
              }
            >
              <Users className="size-4 mr-2" />
              Jamoa
            </CommandItem>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Sahifalar">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.to} onSelect={() => go(item.to)}>
                <Icon className="size-4 mr-2" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function BarberShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    viewMode,
    setViewMode,
    onboardingComplete,
    isJoinedWorker,
    flowIdentity,
    fullyReady,
    activationHydrated,
    ownsSalon,
  } = useBarberContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const nav = useMemo(() => {
    if (!fullyReady) {
      return [
        { to: "/barber/activation", label: "Profil 100%", icon: Sparkles, group: "Asosiy" },
        { to: "/barber/services", label: "Xizmatlar", icon: Scissors, group: "Asosiy" },
        { to: "/barber/schedule", label: "Ish jadvali", icon: Clock, group: "Asosiy" },
      ] satisfies NavItem[];
    }
    const capability = getCapabilities({ onboardingComplete, viewMode, isJoinedWorker });
    const full = mapNav(NAV_CONFIG[capability]);
    if (!onboardingComplete) {
      return full.filter((n) =>
        ["/barber", "/barber/notifications", "/barber/profile"].includes(n.to),
      );
    }
    return full;
  }, [viewMode, onboardingComplete, isJoinedWorker, fullyReady]);
  const capability = useMemo(
    () => getCapabilities({ onboardingComplete, viewMode, isJoinedWorker }),
    [onboardingComplete, viewMode, isJoinedWorker],
  );

  const navigationKey = useMemo(
    () =>
      `${viewMode}-${onboardingComplete ? "ok" : "onb"}-${fullyReady ? "live" : "act"}-${nav.map((n) => n.to).join("|")}`,
    [viewMode, onboardingComplete, fullyReady, nav],
  );

  useEffect(() => {
    if (!activationHydrated || !fullyReady) return;
    if (pathname !== "/barber/activation") return;
    void navigate({ to: "/barber", replace: true });
  }, [activationHydrated, fullyReady, pathname, navigate]);

  useEffect(() => {
    if (!activationHydrated || fullyReady) return;
    if (!pathname.startsWith("/barber")) return;
    if (isBarberPathAllowedDuringActivation(pathname)) return;
    void navigate({ to: "/barber/activation", replace: true });
  }, [activationHydrated, fullyReady, pathname, navigate]);

  useEffect(() => {
    if (!activationHydrated || !onboardingComplete || !fullyReady) return;
    if (viewMode === "salon") {
      if (pathAllowedInSalonWorkspace(pathname, isJoinedWorker)) return;
      if (!pathname.startsWith("/barber")) return;
      void navigate({ to: "/barber/salon-view", replace: true });
      return;
    }
    if (viewMode === "independent" && pathname.startsWith("/barber/salon-view")) {
      if (isJoinedWorker) return;
      void navigate({ to: "/barber", replace: true });
    }
  }, [
    activationHydrated,
    onboardingComplete,
    fullyReady,
    viewMode,
    pathname,
    navigate,
    isJoinedWorker,
  ]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar">
        <Sidebar nav={nav} navAnimationKey={navigationKey} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
          <Sidebar
            nav={nav}
            navAnimationKey={navigationKey}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0">
        <Topbar
          nav={nav}
          onMobileMenu={() => setMobileOpen(true)}
          onCommandOpen={() => setCmdOpen(true)}
        />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        nav={nav}
        capability={capability}
        flowIdentity={flowIdentity}
        fullyReady={fullyReady}
      />
    </div>
  );
}
