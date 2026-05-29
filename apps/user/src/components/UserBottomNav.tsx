import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Map, CalendarCheck, MessageSquare, Bell, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, key: "home" },
  { to: "/map", icon: Map, key: "map" },
  { to: "/bookings", icon: CalendarCheck, key: "bookings" },
  { to: "/chat", icon: MessageSquare, key: "chat" },
  { to: "/notifications", icon: Bell, key: "notifications" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

const HIDE_ON = ["/auth"];

interface Props {
  unreadCount?: number;
}

export function UserBottomNav({ unreadCount = 2 }: Props) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (HIDE_ON.includes(pathname)) return null;

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex h-[68px] max-w-[480px] items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.to);
          const showBadge = tab.key === "notifications" && unreadCount > 0;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="relative flex h-full flex-1 flex-col items-center justify-center gap-1"
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-all",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {showBadge && (
                  <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold tracking-wide",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(`nav.${tab.key}`)}
              </span>
              {active && (
                <span className="absolute -top-px h-[3px] w-8 rounded-b-full bg-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
