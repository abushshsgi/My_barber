import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarClock,
  Map as MapIcon,
  Building2,
  Scissors,
  Users,
  Star,
  Tag,
  BarChart3,
  TrendingUp,
  Wallet,
  CreditCard,
  LifeBuoy,
  Megaphone,
  ShieldCheck,
  UserCog,
  History,
  Bell,
  Search,
  Command as CommandIcon,
  LogOut,
  ChevronRight,
  Menu,
  Sparkles,
  Radio,
  Repeat,
  Fingerprint,
  Gift,
  ArrowLeftRight,
  Banknote,
  QrCode,
  Hash,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Command,
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

// ============= Sections =============
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
type Section = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  matchPrefixes: string[];
};

const SECTIONS: Section[] = [
  {
    key: "ops",
    label: "Operatsiyalar",
    icon: LayoutDashboard,
    matchPrefixes: ["/admin", "/admin/bookings", "/admin/map"],
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/bookings", label: "Bronlar", icon: CalendarClock },
      { to: "/admin/map", label: "Xarita", icon: MapIcon },
    ],
  },
  {
    key: "aylanma",
    label: "Aylanma",
    icon: ArrowLeftRight,
    matchPrefixes: ["/admin/aylanma", "/admin/statistics/wallet"],
    items: [
      { to: "/admin/aylanma", label: "Umumiy aylanma", icon: ArrowLeftRight },
      { to: "/admin/statistics/wallet", label: "Hamyon oqimi", icon: Wallet },
    ],
  },
  {
    key: "accounts",
    label: "Hisob raqam",
    icon: Hash,
    matchPrefixes: ["/admin/hisob-raqam", "/admin/payouts", "/admin/finance/qr-payments"],
    items: [
      { to: "/admin/hisob-raqam", label: "Sartarosh hisoblari", icon: Hash },
      { to: "/admin/payouts", label: "Payouts", icon: Banknote },
      { to: "/admin/finance/qr-payments", label: "QR to'lovlar", icon: QrCode },
    ],
  },
  {
    key: "gifts",
    label: "Sovg'a kartalar",
    icon: Gift,
    matchPrefixes: ["/admin/finance/gifts", "/admin/finance/gift-designs"],
    items: [
      { to: "/admin/finance/gifts", label: "Sovg'a oqimi", icon: Gift },
      { to: "/admin/finance/gift-designs", label: "Dizaynlar", icon: Sparkles },
      { to: "/admin/statistics/wallet", label: "Hamyon nazorati", icon: ShieldCheck },
    ],
  },
  {
    key: "ledger",
    label: "Ledger nazorat",
    icon: Fingerprint,
    matchPrefixes: ["/admin/ledger"],
    items: [
      { to: "/admin/ledger", label: "ID / Hash qidiruv", icon: Fingerprint },
      { to: "/admin/statistics/wallet", label: "Hamyon oqimi", icon: Wallet },
      { to: "/admin/audit", label: "Audit log", icon: History },
    ],
  },
  {
    key: "statistics",
    label: "Statistika",
    icon: BarChart3,
    matchPrefixes: ["/admin/statistics"],
    items: [
      { to: "/admin/statistics/live", label: "Real vaqt", icon: Radio },
      { to: "/admin/statistics", label: "Umumiy", icon: BarChart3 },
      { to: "/admin/statistics/barbers", label: "Sartaroshlar", icon: Scissors },
      { to: "/admin/statistics/users", label: "Mijozlar", icon: Users },
      { to: "/admin/statistics/subscriptions", label: "Obunalar", icon: Repeat },
      { to: "/admin/statistics/customer-invites", label: "Chaqirishlar", icon: UserPlus },
      { to: "/admin/statistics/salons", label: "Salonlar", icon: Building2 },
      { to: "/admin/statistics/bookings", label: "Bronlar", icon: CalendarClock },
    ],
  },
  {
    key: "morph",
    label: "Morph AI",
    icon: Sparkles,
    matchPrefixes: ["/admin/morph-ai"],
    items: [
      { to: "/admin/morph-ai", label: "Analytics", icon: Sparkles },
      { to: "/admin/morph-ai/catalog", label: "Katalog", icon: Tag },
      { to: "/admin/morph-ai/errors", label: "Xatolar", icon: ShieldCheck },
      { to: "/admin/morph-ai/limits", label: "Limitlar", icon: Users },
      { to: "/admin/morph-ai/queue", label: "Navbat", icon: Radio },
      { to: "/admin/morph-ai/budget", label: "Byudjet", icon: Wallet },
      { to: "/admin/morph-ai/popularity", label: "Uslublar", icon: Star },
      { to: "/admin/morph-ai/conversion", label: "Konversiya", icon: TrendingUp },
      { to: "/admin/morph-ai/gallery", label: "Gallery", icon: Search },
      { to: "/admin/morph-ai/settings", label: "Sozlamalar", icon: UserCog },
    ],
  },
  {
    key: "agents",
    label: "Agentlar",
    icon: UserCog,
    matchPrefixes: ["/admin/agents"],
    items: [
      { to: "/admin/agents", label: "Umumiy", icon: LayoutDashboard },
      { to: "/admin/agents/team", label: "Jamoa", icon: Users },
      { to: "/admin/agents/salons", label: "Salonlar", icon: Building2 },
      { to: "/admin/agents/aylanma", label: "Aylanma", icon: ArrowLeftRight },
      { to: "/admin/agents/payouts", label: "Payout", icon: Banknote },
    ],
  },
  {
    key: "network",
    label: "Tarmoq",
    icon: Building2,
    matchPrefixes: ["/admin/salons", "/admin/barbers", "/admin/users", "/admin/reviews"],
    items: [
      { to: "/admin/salons", label: "Salonlar", icon: Building2 },
      { to: "/admin/barbers", label: "Sartaroshlar", icon: Scissors },
      { to: "/admin/reviews", label: "Sharhlar", icon: Star },
      { to: "/admin/users", label: "Mijozlar", icon: Users },
    ],
  },
  {
    key: "catalog",
    label: "Katalog",
    icon: Tag,
    matchPrefixes: ["/admin/services", "/admin/categories"],
    items: [
      { to: "/admin/services", label: "Xizmatlar", icon: Tag },
      { to: "/admin/categories", label: "Kategoriyalar", icon: Tag },
      { to: "/admin/services/analytics", label: "Xizmat statistikasi", icon: BarChart3 },
    ],
  },
  {
    key: "finance",
    label: "Moliya",
    icon: Wallet,
    matchPrefixes: ["/admin/finance", "/admin/subscriptions"],
    items: [
      { to: "/admin/finance", label: "Platforma daromadi", icon: TrendingUp },
      { to: "/admin/subscriptions", label: "B2C Obunalar", icon: Repeat },
      { to: "/admin/finance/deposits", label: "Karta to'ldirish", icon: CreditCard },
      { to: "/admin/finance/promotions", label: "TOP reklamalar", icon: Megaphone },
    ],
  },
  {
    key: "support",
    label: "Yordam",
    icon: LifeBuoy,
    matchPrefixes: ["/admin/support", "/admin/broadcast"],
    items: [
      { to: "/admin/support", label: "Murojaatlar", icon: LifeBuoy },
      { to: "/admin/broadcast", label: "Xabarnoma", icon: Megaphone },
    ],
  },
  {
    key: "settings",
    label: "Sozlamalar",
    icon: ShieldCheck,
    matchPrefixes: ["/admin/audit", "/admin/admins", "/admin/profile"],
    items: [
      { to: "/admin/audit", label: "Audit log", icon: History },
      { to: "/admin/admins", label: "Adminlar", icon: ShieldCheck },
      { to: "/admin/profile", label: "Profil", icon: UserCog },
    ],
  },
];

function findActiveSection(pathname: string): Section {
  // exact dashboard
  if (pathname === "/admin") return SECTIONS[0];
  // longest match
  let best: { sec: Section; len: number } | null = null;
  for (const sec of SECTIONS) {
    for (const p of sec.matchPrefixes) {
      if (p === "/admin") continue;
      if (pathname === p || pathname.startsWith(p + "/")) {
        if (!best || p.length > best.len) best = { sec, len: p.length };
      }
    }
  }
  return best?.sec ?? SECTIONS[0];
}

function findActiveNavItem(items: NavItem[], pathname: string): NavItem {
  let best: NavItem | null = null;
  for (const item of items) {
    const matches =
      item.to === "/admin"
        ? pathname === "/admin"
        : pathname === item.to || pathname.startsWith(item.to + "/");
    if (matches && (!best || item.to.length > best.to.length)) {
      best = item;
    }
  }
  return best ?? items[0];
}

// ============= Icon rail =============
function IconRail({
  activeKey,
  onSelect,
}: {
  activeKey: string;
  onSelect?: (sec: Section) => void;
}) {
  return (
    <aside className="hidden lg:flex w-14 shrink-0 flex-col items-center bg-sidebar border-r border-sidebar-border py-3 gap-1">
      <Link
        to="/admin"
        className="mb-2"
        title="Mysaloon"
        aria-label="Mysaloon Admin"
      >
        <MysaloonLogo compact />
      </Link>
      {SECTIONS.map((sec) => {
        const Icon = sec.icon;
        const active = sec.key === activeKey;
        return (
          <Link
            key={sec.key}
            to={sec.items[0].to}
            onClick={() => onSelect?.(sec)}
            title={sec.label}
            className={cn(
              "size-10 rounded-lg flex items-center justify-center transition-colors group relative",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {sec.label}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}

// ============= Sub nav =============
function SubNav({ section, onNavigate }: { section: Section; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const activeItem = findActiveNavItem(section.items, pathname);
  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-14 px-5 flex items-center border-b border-sidebar-border">
        <div className="font-heading font-semibold text-sidebar-primary tracking-tight">
          {section.label}
        </div>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {section.items.map((item) => {
          const Icon = item.icon;
          const active = item.to === activeItem.to;
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
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <Link
          to="/admin/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <img
            src="https://i.pravatar.cc/150?img=12"
            alt=""
            className="size-8 rounded-full ring-1 ring-sidebar-border object-cover"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-sidebar-primary truncate">Admin Karimov</div>
            <div className="text-xs text-muted-foreground truncate">Bosh administrator</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ============= Topbar =============
function Topbar({
  section,
  onMobileMenu,
  onCommandOpen,
}: {
  section: Section;
  onMobileMenu: () => void;
  onCommandOpen: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const currentItem = findActiveNavItem(section.items, pathname);

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 bg-card border-b border-border">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenu}>
          <Menu className="size-5" />
        </Button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-muted-foreground">{section.label}</span>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground truncate">{currentItem.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Cmd+K trigger */}
        <button
          onClick={onCommandOpen}
          className="hidden md:inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-sm text-muted-foreground"
        >
          <Search className="size-3.5" />
          <span>Tezkor qidiruv</span>
          <kbd className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-card text-[10px] font-mono text-muted-foreground">
            <CommandIcon className="size-2.5" />K
          </kbd>
        </button>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onCommandOpen}>
          <Search className="size-4" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="size-9 rounded-full overflow-hidden ring-1 ring-border">
              <img
                src="https://i.pravatar.cc/150?img=12"
                alt=""
                className="size-full object-cover"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">Admin Karimov</div>
              <div className="text-xs text-muted-foreground font-normal">admin@shearhq.uz</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/admin/profile" })}>
              <UserCog className="size-4 mr-2" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/admin/audit" })}>
              <History className="size-4 mr-2" />
              Audit log
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => toast.info("Tizimdan chiqildi (demo)")}
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

// ============= Command palette =============
function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const allRoutes = useMemo(
    () => SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.label }))),
    [],
  );

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Sahifa, foydalanuvchi yoki amalni qidiring..." />
      <CommandList>
        <CommandEmpty>Hech narsa topilmadi.</CommandEmpty>
        <CommandGroup heading="Tezkor amallar">
          <CommandItem onSelect={() => go("/admin/broadcast")}>
            <Megaphone className="size-4 mr-2" />
            Yangi xabarnoma yuborish
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/services")}>
            <Sparkles className="size-4 mr-2" />
            Yangi xizmat qo'shish
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/services/analytics")}>
            <BarChart3 className="size-4 mr-2" />
            Service statistikasini ko'rish
          </CommandItem>
          <CommandItem onSelect={() => go("/admin/support")}>
            <LifeBuoy className="size-4 mr-2" />
            Murojaatlarni ko'rish
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        {SECTIONS.map((sec) => (
          <CommandGroup key={sec.key} heading={sec.label}>
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.to} onSelect={() => go(item.to)}>
                  <Icon className="size-4 mr-2" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

// ============= Shell =============
export function AdminShell() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const activeSection = findActiveSection(pathname);

  // Cmd+K hotkey
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
    <div className="flex h-dvh w-full bg-background text-foreground">
      <IconRail activeKey={activeSection.key} />

      <aside className="hidden lg:flex w-56 shrink-0 border-r border-sidebar-border bg-sidebar">
        <SubNav section={activeSection} />
      </aside>

      {/* Mobile combined drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[300px] bg-sidebar border-sidebar-border flex">
          <div className="w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 gap-1">
            <div className="size-9 mb-2 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-heading font-bold text-base">
              S
            </div>
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = sec.key === activeSection.key;
              return (
                <Link
                  key={sec.key}
                  to={sec.items[0].to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "size-10 rounded-lg flex items-center justify-center transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon className="size-[18px]" />
                </Link>
              );
            })}
          </div>
          <div className="flex-1">
            <SubNav section={activeSection} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0">
        <Topbar
          section={activeSection}
          onMobileMenu={() => setMobileOpen(true)}
          onCommandOpen={() => setCmdOpen(true)}
        />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
