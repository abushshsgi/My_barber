"use client";

import { Link, usePathname } from "@/navigation";
import { Home, Map, CalendarDays, Bell, User, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Asosiy", path: "/" },
  { icon: Map, label: "Xarita", path: "/map" },
  { icon: CalendarDays, label: "Bandlar", path: "/bookings" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Bell, label: "Xabar", path: "/notifications" },
  { icon: User, label: "Profil", path: "/profile" },
];

export function UserBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom pointer-events-none"
      aria-label="Asosiy navigatsiya"
    >
      <div className="mx-3 sm:mx-auto sm:max-w-md mb-3 pointer-events-auto">
        <div className="nav-dock-surface backdrop-blur-xl rounded-[1.35rem] px-0.5 py-1">
          <div className="flex items-center justify-around h-[52px] sm:h-[56px]">
            {navItems.map(({ icon: Icon, label, path }) => {
              const active =
                path === "/" ? pathname === "/" : pathname.startsWith(path);

              return (
                <Link
                  key={path}
                  href={path}
                  className="relative flex flex-col items-center gap-0.5 px-1.5 sm:px-3 py-1 min-w-0 flex-1 max-w-[72px] cursor-pointer rounded-lg"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute -top-0.5 w-6 sm:w-8 h-[2px] sm:h-[3px] rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <motion.div
                    animate={active ? { y: -1, scale: 1.06 } : { y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] transition-colors duration-200",
                        active ? "text-accent stroke-[2.25]" : "text-muted-foreground"
                      )}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "text-[8px] sm:text-[9px] font-semibold leading-tight text-center transition-colors duration-200 truncate w-full",
                      active ? "text-accent" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
