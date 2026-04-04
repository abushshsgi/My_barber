"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Users, Star, UserPlus, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/barber" },
  { icon: Store, label: "Salon", path: "/barber/salon" },
  { icon: Users, label: "Mijozlar", path: "/barber/clients" },
  { icon: Star, label: "Sharhlar", path: "/barber/reviews" },
  { icon: UserPlus, label: "Jamoa", path: "/barber/team" },
  { icon: CircleUser, label: "Profil", path: "/barber/profile" },
];

export function BarberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-lg">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              href={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all text-xs",
                active ? "text-accent" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
