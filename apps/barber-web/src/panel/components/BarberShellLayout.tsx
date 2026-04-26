"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Menu,
  Building2,
  Images,
  ArrowLeftRight,
  Scissors,
  Wallet,
  BarChart3,
  Megaphone,
  Settings,
  HelpCircle,
  CalendarDays,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { useApp } from "@/panel/contexts/AppContext";
import { useBarberOnboardingStatus } from "@/hooks/useBarberOnboardingStatus";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
};

const INDEPENDENT_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "Asosiy" },
  { href: "/calendar", label: "Kalendar", icon: CalendarDays, group: "Asosiy" },
  { href: "/bookings", label: "Bronlar", icon: CalendarClock, group: "Asosiy" },
  { href: "/clients", label: "Mijozlar", icon: Users, group: "Asosiy" },
  { href: "/chat", label: "Chat", icon: MessageSquare, group: "Aloqa" },
  { href: "/notifications", label: "Bildirishnomalar", icon: Bell, group: "Aloqa" },
  { href: "/reviews", label: "Sharhlar", icon: Star, group: "Aloqa" },
  { href: "/earnings", label: "Daromad", icon: Wallet, group: "Biznes" },
  { href: "/stats", label: "Statistika", icon: BarChart3, group: "Biznes" },
  { href: "/marketing", label: "Marketing", icon: Megaphone, group: "Biznes" },
  { href: "/profile", label: "Profil", icon: UserCog, group: "Sozlama" },
  { href: "/settings", label: "Sozlamalar", icon: Settings, group: "Sozlama" },
  { href: "/help", label: "Yordam", icon: HelpCircle, group: "Sozlama" },
];

const SALON_NAV: NavItem[] = [
  { href: "/salon-view", label: "Salon", icon: Building2 },
  { href: "/salon-view/gallery", label: "Galereya", icon: Images },
  { href: "/salon-view/reviews", label: "Sharhlar", icon: Star },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  nav,
  onNavigate,
}: {
  nav: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const { viewMode, setViewMode, salons, me } = useApp();
  const { data: onboarding, isLoading } = useBarberOnboardingStatus(true);
  const isComplete = !isLoading && Boolean(onboarding?.is_complete);
  const hasSalon = salons.length > 0;
  const initial = (me?.full_name || me?.email || "—").trim().charAt(0) || "—";

  const groups = useMemo(() => {
    const map = nav.reduce<Record<string, NavItem[]>>((acc, item) => {
      const g = item.group ?? "—";
      (acc[g] ??= []).push(item);
      return acc;
    }, {});
    return Object.entries(map);
  }, [nav]);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
          <Scissors className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="font-heading font-semibold text-sidebar-primary text-sm leading-tight">
            MyBarber
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            Barber Panel
          </div>
        </div>
      </div>

      {hasSalon && isComplete && (
        <div className="p-3 border-b border-sidebar-border">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "independent" ? "salon" : "independent")}
            className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm hover:bg-foreground hover:text-background transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeftRight className="size-3.5" />
              {viewMode === "independent" ? "Salon View" : "Independent View"}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-70">{viewMode}</span>
          </button>
        </div>
      )}

      <nav className="flex-1 p-3 overflow-y-auto">
        {groups.map(([g, items]) => (
          <div key={g} className="mb-4 last:mb-0">
            {g !== "—" && (
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {g}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <div className="size-9 rounded-full ring-1 ring-sidebar-border bg-muted flex items-center justify-center font-semibold text-sm text-foreground">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-sidebar-primary truncate">
              {me?.full_name || me?.email || "—"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {me?.work_mode === "salon" ? "Salon barber" : "Independent barber"}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function CommandPalette({
  open,
  onOpenChange,
  nav,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nav: NavItem[];
}) {
  const router = useRouter();
  const go = (to: string) => {
    onOpenChange(false);
    router.push(to);
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Sahifa yoki amalni qidiring..." />
      <CommandList>
        <CommandEmpty>Hech narsa topilmadi.</CommandEmpty>
        <CommandGroup heading="Sahifalar">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.href} onSelect={() => go(item.href)}>
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tezkor">
          <CommandItem onSelect={() => go("/bookings")}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Bugungi bronlar
          </CommandItem>
          <CommandItem onSelect={() => go("/chat")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </CommandItem>
          <CommandItem onSelect={() => go("/profile")}>
            <UserCog className="mr-2 h-4 w-4" />
            Profil
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function BarberShellLayout({ children }: { children: React.ReactNode }) {
  const { notifications, viewMode } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const { data: onboarding, isLoading } = useBarberOnboardingStatus(true);
  const isComplete = !isLoading && Boolean(onboarding?.is_complete);

  const nav = useMemo(() => {
    if (!isComplete) {
      return INDEPENDENT_NAV.filter((n) => ["/", "/notifications", "/profile"].includes(n.href));
    }
    return viewMode === "salon" ? SALON_NAV : INDEPENDENT_NAV;
  }, [isComplete, viewMode]);

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

  useEffect(() => {
    // Keep URL consistent with selected view mode.
    if (viewMode === "independent" && pathname.startsWith("/salon-view")) {
      router.replace("/");
      return;
    }
    if (viewMode === "salon") {
      const independentOnlyPrefixes = ["/bookings", "/clients", "/chat", "/reviews"];
      if (independentOnlyPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        router.replace("/salon-view");
      }
    }
  }, [viewMode, pathname, router]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar">
        <Sidebar nav={nav} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
          <Sidebar nav={nav} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden md:inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm text-muted-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Qidirish</span>
              <kbd className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">
                <CommandIcon className="h-2.5 w-2.5" />K
              </kbd>
            </button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setCmdOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>

            <Link
              href="/notifications"
              className="relative inline-flex items-center justify-center size-9 rounded-md hover:bg-accent transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-foreground ring-2 ring-background" />
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="size-9 rounded-full overflow-hidden ring-1 ring-border bg-muted flex items-center justify-center font-semibold">
                  {(nav[0]?.label || "M").charAt(0)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Menu</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Sozlamalar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/help")}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Yordam
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} nav={nav} />
    </div>
  );
}

