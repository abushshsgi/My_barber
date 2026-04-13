"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-2 sm:mx-3 mb-1.5 sm:mb-2">
        <div className="bg-foreground/95 backdrop-blur-xl rounded-2xl sm:rounded-[20px] shadow-2xl shadow-foreground/20">
          <div className="flex items-center justify-around h-[52px] sm:h-[56px] max-w-lg mx-auto px-1 sm:px-2">
            {navItems.map(({ icon: Icon, label, path }) => {
              const active =
                path === "/" ? pathname === "/" : pathname.startsWith(path);

              return (
                <Link
                  key={path}
                  href={path}
                  className="relative flex flex-col items-center gap-0.5 px-1.5 sm:px-3 py-1 min-w-0 flex-1 max-w-[72px]"
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
                        "h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] transition-colors duration-150",
                        active ? "text-accent stroke-[2.5]" : "text-background/50"
                      )}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "text-[8px] sm:text-[9px] font-semibold leading-tight text-center transition-colors duration-150 truncate w-full",
                      active ? "text-accent" : "text-background/40"
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
