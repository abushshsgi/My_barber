import { useEffect, useMemo, useState } from "react";
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
  Sparkles,
  Scissors,
  Wallet,
  BarChart3,
  Megaphone,
  Settings,
  HelpCircle,
  CalendarDays,
  Package,
  Receipt,
  ImageIcon,
  Target,
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
import { toast } from "sonner";
import { useBarberContext } from "./BarberContext";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
};

const INDEPENDENT_NAV: NavItem[] = [
  { to: "/barber", label: "Dashboard", icon: LayoutDashboard, group: "Asosiy" },
  { to: "/barber/calendar", label: "Kalendar", icon: CalendarDays, group: "Asosiy" },
  { to: "/barber/bookings", label: "Bronlar", icon: CalendarClock, group: "Asosiy" },
  { to: "/barber/clients", label: "Mijozlar", icon: Users, group: "Asosiy" },
  { to: "/barber/chat", label: "Chat", icon: MessageSquare, group: "Aloqa" },
  { to: "/barber/notifications", label: "Bildirishnomalar", icon: Bell, group: "Aloqa" },
  { to: "/barber/reviews", label: "Sharhlar", icon: Star, group: "Aloqa" },
  { to: "/barber/portfolio", label: "Portfolio", icon: ImageIcon, group: "Aloqa" },
  { to: "/barber/earnings", label: "Daromad", icon: Wallet, group: "Biznes" },
  { to: "/barber/expenses", label: "Xarajatlar", icon: Receipt, group: "Biznes" },
  { to: "/barber/inventory", label: "Inventar", icon: Package, group: "Biznes" },
  { to: "/barber/stats", label: "Statistika", icon: BarChart3, group: "Biznes" },
  { to: "/barber/marketing", label: "Marketing", icon: Megaphone, group: "Biznes" },
  { to: "/barber/goals", label: "Maqsadlar", icon: Target, group: "Biznes" },
  { to: "/barber/profile", label: "Profil", icon: UserCog, group: "Sozlama" },
  { to: "/barber/settings", label: "Sozlamalar", icon: Settings, group: "Sozlama" },
  { to: "/barber/help", label: "Yordam", icon: HelpCircle, group: "Sozlama" },
];

/** Salon egasi: boshqaruv + jamoa */
const OWNER_SALON_NAV: NavItem[] = [
  { to: "/barber/salon-view", label: "Salon", icon: Building2 },
  { to: "/barber/salon-view/gallery", label: "Galereya", icon: Images },
  { to: "/barber/salon-view/reviews", label: "Sharhlar", icon: Star },
  { to: "/barber/salon-view/team", label: "Jamoa", icon: Users },
];

/** Salon join qilgan ishchi: boshqarma, faqat ko‘rish + jamoa */
const WORKER_SALON_NAV: NavItem[] = [
  { to: "/barber/salon-view", label: "Salon", icon: Building2 },
  { to: "/barber/salon-view/members", label: "Jamoa", icon: Users },
  { to: "/barber/salon-view/reviews", label: "Sharhlar", icon: Star },
  { to: "/barber/salon-view/gallery", label: "Galereya", icon: Images },
];

function Sidebar({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { viewMode, setViewMode, hasSalon, onboardingComplete, ownsSalon, profile } =
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

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {(() => {
          const groups = nav.reduce<Record<string, NavItem[]>>((acc, item) => {
            const g = item.group ?? "—";
            (acc[g] ??= []).push(item);
            return acc;
          }, {});
          const order = Object.keys(groups);
          return order.map((g) => (
            <div key={g} className="mb-4 last:mb-0">
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
                      : pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </nav>

      {/* Profile card */}
      <div className="p-3 border-t border-sidebar-border">
        <Link
          to="/barber/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <img
            src={profile.avatar}
            alt=""
            className="size-9 rounded-full ring-1 ring-sidebar-border object-cover"
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
  const { notifications, profile, viewMode, isJoinedWorker } = useBarberContext();
  const unread = notifications.filter((n) => !n.read).length;

  const currentItem =
    nav.find((i) => pathname === i.to || (i.to !== "/barber" && pathname.startsWith(i.to + "/"))) ??
    nav[0];

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenu}>
          <Menu className="size-5" />
        </Button>
        <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-muted-foreground capitalize">
            {viewMode === "independent" ? "Mustaqil" : "Salon"}
          </span>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground truncate">{currentItem.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isJoinedWorker && viewMode === "salon" && (
          <Button variant="outline" size="sm" className="hidden sm:inline-flex shrink-0" asChild>
            <Link to="/barber/salon-view">
              <Building2 className="size-3.5" />
              Salonga oʻtish
            </Link>
          </Button>
        )}

        <button
          onClick={onCommandOpen}
          className="hidden md:inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm text-muted-foreground"
        >
          <Search className="size-3.5" />
          <span>Qidirish</span>
          <kbd className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">
            <CommandIcon className="size-2.5" />K
          </kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onCommandOpen}>
          <Search className="size-4" />
        </Button>

        <Link
          to="/barber/notifications"
          className="relative inline-flex items-center justify-center size-9 rounded-md hover:bg-accent transition-colors"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-foreground ring-2 ring-background" />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="size-9 rounded-full overflow-hidden ring-1 ring-border">
              <img src={profile.avatar} alt="" className="size-full object-cover" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{profile.name}</div>
              <div className="text-xs text-muted-foreground font-normal">{profile.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nav: NavItem[];
}) {
  const navigate = useNavigate();
  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Sahifa yoki amalni qidiring..." />
      <CommandList>
        <CommandEmpty>Hech narsa topilmadi.</CommandEmpty>
        <CommandGroup heading="Tezkor amallar">
          <CommandItem onSelect={() => go("/barber/bookings")}>
            <CalendarClock className="size-4 mr-2" />
            Bugungi bronlarni ko'rish
          </CommandItem>
          <CommandItem onSelect={() => go("/barber/chat")}>
            <MessageSquare className="size-4 mr-2" />
            Yangi xabar
          </CommandItem>
          <CommandItem onSelect={() => go("/barber/profile")}>
            <Sparkles className="size-4 mr-2" />
            Xizmat qo'shish
          </CommandItem>
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
  const { viewMode, onboardingComplete, isJoinedWorker } = useBarberContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const nav = useMemo(() => {
    if (!onboardingComplete) {
      return INDEPENDENT_NAV.filter((n) =>
        ["/barber", "/barber/notifications", "/barber/profile"].includes(n.to),
      );
    }
    if (viewMode === "salon") {
      return isJoinedWorker ? WORKER_SALON_NAV : OWNER_SALON_NAV;
    }
    return INDEPENDENT_NAV;
  }, [viewMode, onboardingComplete, isJoinedWorker]);

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
        <Sidebar nav={nav} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
          <Sidebar nav={nav} onNavigate={() => setMobileOpen(false)} />
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

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} nav={nav} />
    </div>
  );
}
