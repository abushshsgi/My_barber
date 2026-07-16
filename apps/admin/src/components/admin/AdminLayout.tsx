import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarClock,
  Map as MapIcon,
  Building2,
  Scissors,
  Users,
  Star,
  LogOut,
  Search,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operatsiyalar",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/bookings", label: "Bronlar", icon: CalendarClock },
      { to: "/admin/map", label: "Xarita", icon: MapIcon },
    ],
  },
  {
    label: "Tarmoq",
    items: [
      { to: "/admin/salons", label: "Salonlar", icon: Building2 },
      { to: "/admin/barbers", label: "Sartaroshlar", icon: Scissors },
      { to: "/admin/users", label: "Mijozlar", icon: Users },
      { to: "/admin/reviews", label: "Sharhlar", icon: Star },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-4">
          <div className="px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-2">
            {group.label}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
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
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2">
          <MysaloonLogo size="md" subtitle="Admin" />
        </Link>
      </div>

      <NavList onNavigate={onNavigate} />

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <img
            src="https://i.pravatar.cc/150?img=12"
            alt=""
            className="size-9 rounded-full ring-1 ring-sidebar-border object-cover"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-sidebar-primary truncate">Admin Karimov</div>
            <div className="text-xs text-muted-foreground truncate">Bosh administrator</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => {
            toast.info("Tizimdan chiqildi (demo)");
            navigate({ to: "/admin" });
            onNavigate?.();
          }}
        >
          <LogOut className="size-4 mr-2" />
          Chiqish
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>

            <div className="flex items-center w-full max-w-sm bg-background rounded-full px-4 py-1.5 border border-border focus-within:border-foreground/20 transition-colors">
              <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Qidirish..."
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Hudud:</span>
            <span className="font-medium text-foreground">Butun O'zbekiston</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
