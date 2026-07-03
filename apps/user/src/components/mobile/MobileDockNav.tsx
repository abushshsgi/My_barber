import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, Home, Map, MessageSquare, User } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { isNavTabActive, isNavTabCurrent } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, key: "home" },
  { to: "/map", icon: Map, key: "map" },
  { to: "/bookings", icon: CalendarCheck, key: "bookings" },
  { to: "/chat", icon: MessageSquare, key: "chat" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

const HIDE_ON = ["/auth", "/ai-style"];

type Props = {
  unreadCount?: number;
};

/** Neo Brutal floating dock — 5 tab, mobil-only. */
export function MobileDockNav({ unreadCount = 0 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);

  useEffect(() => {
    tabs.forEach((tab) => {
      void router.preloadRoute({ to: tab.to });
    });
  }, [router]);

  useEffect(() => {
    const sync = () => {
      setFaceCameraOpen(document.documentElement.dataset.faceCamera === "open");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-face-camera"],
    });
    return () => observer.disconnect();
  }, []);

  if (HIDE_ON.includes(pathname) || faceCameraOpen) return null;

  const activeIndex = tabs.findIndex(({ to }) => isNavTabActive(pathname, to));

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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="pointer-events-auto relative w-full max-w-md">
        <div className="pointer-events-none absolute inset-x-10 -top-3 h-px gold-divider opacity-50" />
        <div className="relative flex items-stretch justify-between rounded-[22px] border border-border bg-surface px-1.5 py-1.5 shadow-dock">
          {tabs.map(({ to, icon: Icon, key }, idx) => {
            const active = idx === activeIndex;
            const showBadge = key === "chat" && unreadCount > 0;
            return (
              <Link
                key={to}
                to={to}
                preload="intent"
                onClick={handleTabClick(to)}
                aria-label={t(`nav.${key}`)}
                aria-current={active ? "page" : undefined}
                className="group relative flex min-h-[44px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {active ? (
                  <motion.span
                    layoutId="user-dock-active"
                    transition={{ type: "spring", stiffness: 480, damping: 40 }}
                    className="absolute inset-x-1 top-0.5 bottom-0.5 -z-0 rounded-xl border border-border bg-primary"
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 grid h-7 w-7 place-items-center transition",
                    active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
                  {showBadge ? (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border border-border bg-foreground px-1 text-[9px] font-bold leading-none text-background">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "relative z-10 text-[9px] font-bold uppercase tracking-wide",
                    active ? "text-primary-foreground" : "text-muted-foreground",
                  )}
                  suppressHydrationWarning
                >
                  {t(`nav.${key}`)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
