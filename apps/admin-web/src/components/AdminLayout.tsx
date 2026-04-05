"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  UserCheck,
  CalendarDays,
  LogOut,
  Users,
  Scissors,
  Store,
  Menu,
  Shield,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { clearTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: MapPinned, label: "Xarita", path: "/admin/map" },
  { icon: Users, label: "Mijozlar", path: "/admin/users" },
  { icon: Scissors, label: "Sartaroshlar", path: "/admin/barbers" },
  { icon: Store, label: "Salonlar", path: "/admin/salons" },
  { icon: CalendarDays, label: "Bandlar", path: "/admin/bookings" },
  { icon: UserCheck, label: "Arizalar", path: "/admin/approvals" },
];

function NavList({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {navItems.map(({ icon: Icon, label, path }) => {
        const active =
          path === "/admin"
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname === path || pathname.startsWith(`${path}/`);
        return (
          <Link
            key={path}
            href={path}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary border border-primary/25 shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    clearTokens();
    router.replace("/auth?next=/admin");
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen admin-bg admin-bg-grid">
        {/* Desktop sidebar */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl">
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Console
              </p>
              <p className="truncate text-sm font-bold text-foreground">MyBarber</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavList pathname={pathname} />
          </div>
          <div className="border-t border-sidebar-border p-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </div>
        </aside>

        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-background/80 px-3 backdrop-blur-md lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 border-border/60">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Menyu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <SheetTitle className="text-base">MyBarber Admin</SheetTitle>
                    <p className="text-xs font-normal text-muted-foreground">Navigatsiya</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="px-3 py-4">
                <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-sidebar-border p-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Chiqish
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-sm font-bold tracking-tight text-foreground">Admin</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <div className="lg:pl-64">
          <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
            <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
