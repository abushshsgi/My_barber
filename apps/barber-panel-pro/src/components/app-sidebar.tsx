import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageCircle,
  Star,
  User,
  Bell,
  Building2,
  ArrowLeftRight,
  Scissors,
} from "lucide-react";
import { useBarberStore } from "@/lib/barber-store";
import { cn } from "@/lib/utils";
import { clearTokens } from "@/lib/api";
import { useBarberMe } from "@/lib/barber-queries";

const independentNav = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Bookings", to: "/bookings", icon: Calendar },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Chat", to: "/chat", icon: MessageCircle },
  { label: "Reviews", to: "/reviews", icon: Star },
  { label: "Profile", to: "/profile", icon: User },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Setup", to: "/setup", icon: Scissors },
];

const salonNav = [
  { label: "Overview", to: "/salon-view", icon: Building2 },
  { label: "Gallery", to: "/salon-view/gallery", icon: LayoutDashboard },
  { label: "Reviews", to: "/salon-view/reviews", icon: Star },
];

export function AppSidebar() {
  const { view, setView, salons } = useBarberStore();
  const me = useBarberMe();
  const location = useLocation();
  const hasSalons = salons.length > 0;
  const navItems = view === "independent" ? independentNav : salonNav;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <Scissors className="h-5 w-5" strokeWidth={1.5} />
        <span className="text-display text-base font-semibold tracking-tight">MyBarber</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {hasSalons && (
          <>
            <div className="my-4 h-px bg-border" />
            <button
              onClick={() => setView(view === "independent" ? "salon" : "independent")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeftRight className="h-4 w-4" strokeWidth={1.5} />
              {view === "independent" ? "Salon View" : "Independent View"}
            </button>
          </>
        )}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {(me.data?.full_name || me.data?.email || "B").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{me.data?.full_name || me.data?.email || "Barber"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{me.data?.work_mode || "BARBER"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              clearTokens();
              window.location.href = "/auth";
            }}
            className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
