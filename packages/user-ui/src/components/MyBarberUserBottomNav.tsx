import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Calendar, Compass, MapPin, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  { to: "/", label: "Asosiy", icon: Compass },
  { to: "/map", label: "Xarita", icon: MapPin },
  { to: "/bookings", label: "Bandlar", icon: Calendar },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/notifications", label: "Xabar", icon: Bell },
  { to: "/profile", label: "Profil", icon: User },
] as const;

const HIDE_ON = ["/auth"];

type MyBarberUserBottomNavProps = {
  unreadCount?: number;
};

export function MyBarberUserBottomNav({ unreadCount = 0 }: MyBarberUserBottomNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (HIDE_ON.includes(pathname)) return null;

  const activeIndex = TABS.findIndex(({ to }) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to),
  );

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="pointer-events-auto relative w-full max-w-md">
        <div className="pointer-events-none absolute inset-x-10 -top-3 h-px gold-divider opacity-50" />
        <div className="relative flex items-stretch justify-between rounded-[22px] border-2 border-border bg-surface px-1.5 py-1.5 shadow-dock">
          {TABS.map(({ to, label, icon: Icon }, idx) => {
            const active = idx === activeIndex;
            const showBadge = to === "/notifications" && unreadCount > 0;
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="group relative flex min-h-[44px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {active ? (
                  <motion.span
                    layoutId="user-dock-active"
                    transition={{ type: "spring", stiffness: 480, damping: 40 }}
                    className="absolute inset-x-1 top-0.5 bottom-0.5 -z-0 rounded-xl border-2 border-border bg-primary"
                  />
                ) : null}
                <span
                  className={[
                    "relative z-10 grid h-7 w-7 place-items-center transition",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
                  {showBadge ? (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-md border border-border bg-gold px-1 text-[9px] font-bold leading-none text-gold-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </span>
                <span
                  className={[
                    "relative z-10 text-[9px] font-bold uppercase tracking-wide",
                    active ? "text-primary-foreground" : "text-muted-foreground",
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
