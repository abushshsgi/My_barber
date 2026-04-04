"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  CalendarDays,
  LogOut,
  Users,
  Scissors,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { clearTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Mijozlar", path: "/admin/users" },
  { icon: Scissors, label: "Sartaroshlar", path: "/admin/barbers" },
  { icon: Store, label: "Salonlar", path: "/admin/salons" },
  { icon: CalendarDays, label: "Bandlar", path: "/admin/bookings" },
  { icon: UserCheck, label: "Arizalar", path: "/admin/approvals" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-lg px-4 py-2">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <span
              className="font-bold text-sm gold-gradient bg-clip-text text-transparent"
              style={{
                background: "linear-gradient(135deg, hsl(172 58% 50%), hsl(190 55% 48%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Admin
            </span>
            <div className="flex flex-wrap gap-1 flex-1">
              {navItems.map(({ icon: Icon, label, path }) => {
                const active =
                  path === "/admin"
                    ? pathname === "/admin" || pathname === "/admin/"
                    : pathname === path || pathname.startsWith(`${path}/`);
                return (
                  <Link
                    key={path}
                    href={path}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                );
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                clearTokens();
                router.replace("/auth?next=/admin");
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Chiqish
            </Button>
          </div>
        </nav>
        {children}
      </div>
    </AdminAuthGuard>
  );
}
