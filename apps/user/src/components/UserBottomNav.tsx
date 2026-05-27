"use client";

import { Link, usePathname } from "@/navigation";
import {
  Compass,
  MapPin,
  Calendar,
  MessageCircle,
  Bell,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/api";
import { fetchNotifications } from "@/lib/notifications-queries";
import { motion } from "framer-motion";
import { unreadNotificationCount } from "../lib/notification-prefs";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { areNotificationAlertsEnabled } from "../lib/user-preferences";

const TABS = [
  { to: "/", label: "Asosiy", icon: Compass },
  { to: "/map", label: "Xarita", icon: MapPin },
  { to: "/bookings", label: "Bandlar", icon: Calendar },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/notifications", label: "Xabar", icon: Bell },
  { to: "/profile", label: "Profil", icon: User },
] as const;

export function UserBottomNav() {
  const pathname = usePathname();
  const isLoggedIn = !!getAccessToken();
  const prefs = useUserPreferences();

  const { data: notifications = [], isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 30_000,
    retry: false,
    enabled: isLoggedIn && areNotificationAlertsEnabled(prefs),
  });

  const unread = isError ? 0 : unreadNotificationCount(notifications, prefs);
  const activeIndex = TABS.findIndex(({ to }) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to),
  );

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="pointer-events-auto relative w-full max-w-md">
        {/* Subtle gold underline above dock */}
        <div className="pointer-events-none absolute inset-x-10 -top-3 h-px gold-divider opacity-50" />

        <div
          className="glass-dock relative flex items-stretch justify-between rounded-[28px] border border-white/10 px-1.5 py-1.5 shadow-dock"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--surface) 92%, transparent) 0%, color-mix(in oklab, var(--surface) 78%, transparent) 100%)",
          }}
        >
          {TABS.map(({ to, label, icon: Icon }, idx) => {
            const active = idx === activeIndex;
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="group relative flex min-h-[44px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {active && (
                  <motion.span
                    layoutId="user-dock-active"
                    transition={{ type: "spring", stiffness: 480, damping: 40 }}
                    className="absolute inset-x-1 top-0.5 bottom-0.5 -z-0 rounded-2xl bg-foreground"
                  />
                )}
                <span
                  className={[
                    "relative z-10 grid h-7 w-7 place-items-center transition",
                    active ? "text-background" : "text-muted-foreground group-hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden strokeWidth={active ? 2.4 : 2} />
                  {to === "/notifications" && unread > 0 && (
                    <span
                      className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold leading-none text-gold-foreground ring-2 ring-surface"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                <span
                  className={[
                    "relative z-10 max-w-full truncate text-[9.5px] tracking-wide transition",
                    active ? "font-semibold text-background" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
