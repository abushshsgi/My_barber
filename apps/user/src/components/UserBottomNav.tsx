import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Map, CalendarCheck, MessageSquare, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { isNavTabActive, isNavTabCurrent } from "@/lib/navigation";

/**
 * Floating Control Center Dock — premium glass dock.
 * Lives detached from the bottom edge, respects safe-area, and uses
 * `glass-dock` utility (backdrop-blur) for the Midnight Opulence aesthetic.
 */
const tabs = [
  { to: "/", icon: Home, key: "home" },
  { to: "/map", icon: Map, key: "map" },
  { to: "/bookings", icon: CalendarCheck, key: "bookings" },
  { to: "/chat", icon: MessageSquare, key: "chat" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

const HIDE_ON = ["/auth"];

interface Props {
  unreadCount?: number;
}

export function UserBottomNav({ unreadCount = 2 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    tabs.forEach((tab) => {
      void router.preloadRoute({ to: tab.to });
    });
  }, [router]);

  if (HIDE_ON.includes(pathname)) return null;

  const handleTabClick = (to: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isNavTabCurrent(pathname, to)) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (to === "/chat" && pathname.startsWith("/chat/")) {
      event.preventDefault();
      void navigate({ to: "/chat", resetScroll: true });
    }
  };

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      aria-label="Bottom navigation"
    >
      <LayoutGroup id="user-bottom-dock">
        <div className="glass-dock pointer-events-auto flex w-full max-w-[440px] items-center justify-between gap-1 rounded-full px-2 py-2 shadow-luxury">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isNavTabActive(pathname, tab.to);
            const showBadge = tab.key === "chat" && unreadCount > 0;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                preload="intent"
                onClick={handleTabClick(tab.to)}
                className={cn(
                  "relative flex h-12 flex-1 items-center justify-center rounded-full px-2",
                  "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
                )}
                aria-current={active ? "page" : undefined}
                aria-label={t(`nav.${tab.key}`) as string}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active-pill"
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 360, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span className="relative">
                    <Icon
                      className={cn(
                        "h-[20px] w-[20px] transition-colors",
                        active ? "text-background" : "text-foreground/70",
                      )}
                      strokeWidth={active ? 2.4 : 1.9}
                    />
                    {showBadge && (
                      <span
                        className={cn(
                          "absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold",
                          "bg-gold text-onyx ring-2 ring-background",
                        )}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {active && (
                    <motion.span
                      key={tab.key}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden whitespace-nowrap text-[12px] font-semibold tracking-wide text-background"
                      suppressHydrationWarning
                    >
                      {t(`nav.${tab.key}`)}
                    </motion.span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
