import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Map, CalendarCheck, MessageSquare, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { isNavTabActive, isNavTabCurrent } from "@/lib/navigation";

/** Asosiy 5 tab — qolgan funksiyalar profil hublarida. */
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex h-[68px] max-w-[480px] items-center justify-around px-2">
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
                suppressHydrationWarning
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
