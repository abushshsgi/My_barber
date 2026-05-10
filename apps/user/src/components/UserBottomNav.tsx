"use client";

import { Link, usePathname } from "@/navigation";
import {
  Compass,
  MapPin,
  CalendarDays,
  MessageCircle,
  Bell,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/notifications-queries";

const TABS = [
  { to: "/", label: "Asosiy", icon: Compass },
  { to: "/map", label: "Xarita", icon: MapPin },
  { to: "/bookings", label: "Bandlar", icon: CalendarDays },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/notifications", label: "Xabar", icon: Bell },
  { to: "/profile", label: "Profil", icon: User },
] as const;

export function UserBottomNav() {
  const pathname = usePathname();

  const { data: notifications = [], isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 30_000,
    retry: false,
  });

  const unread = isError ? 0 : notifications.filter((n) => !n.read_at).length;

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-safe"
      aria-label="Asosiy navigatsiya"
    >
      <div className="pointer-events-auto mx-3 mb-2 flex w-full max-w-md items-center justify-between rounded-[24px] border border-border bg-surface/95 p-1.5 shadow-dock backdrop-blur-2xl">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-2xl py-1 text-[10px] font-medium outline-none transition",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative grid h-9 w-9 place-items-center rounded-2xl transition",
                  active
                    ? "bg-foreground text-background shadow-soft"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {to === "/notifications" && unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-foreground ring-2 ring-surface" />
                )}
              </span>
              <span
                className={cn(
                  "text-[9px] tracking-wide transition",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
