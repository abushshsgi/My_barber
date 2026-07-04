import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, Home, Map, User, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isNavTabActive, isNavTabCurrent } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const leftTabs = [
  { to: "/", icon: Home, key: "home" },
  { to: "/map", icon: Map, key: "map" },
] as const;

const rightTabs = [
  { to: "/bookings", icon: CalendarCheck, key: "bookings" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

const centerTab = { to: "/ai-style", icon: Wand2, key: "aiStyle" } as const;

const allRoutes = [...leftTabs, centerTab, ...rightTabs];

import { shouldShowMobileDock } from "@/lib/layout-routes";

type Props = {
  unreadCount?: number;
};

function DockTab({
  to,
  icon: Icon,
  labelKey,
  active,
  onClick,
}: {
  to: string;
  icon: typeof Home;
  labelKey: string;
  active: boolean;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <Link
      to={to}
      preload="intent"
      onClick={onClick}
      aria-label={t(labelKey)}
      aria-current={active ? "page" : undefined}
      className="group flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl transition",
          active
            ? "bg-foreground text-background"
            : "text-muted-foreground group-active:text-foreground",
        )}
      >
        <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[10px] font-semibold leading-none",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        suppressHydrationWarning
      >
        {t(labelKey)}
      </span>
    </Link>
  );
}

/** Mobil pastki navigatsiya — markazda AI tugmasi, bar bilan tekis. */
export function MobileDockNav({ unreadCount: _unreadCount = 0 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);

  useEffect(() => {
    allRoutes.forEach((tab) => {
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

  if (!shouldShowMobileDock(pathname) || faceCameraOpen) return null;

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

  const CenterIcon = centerTab.icon;
  const aiActive = isNavTabActive(pathname, centerTab.to);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="pointer-events-auto relative w-full max-w-md">
        <div className="relative flex min-h-[58px] items-end rounded-[22px] border border-border bg-surface px-1 pb-1 pt-1 shadow-dock">
          <div className="flex min-w-0 flex-1 items-stretch">
            {leftTabs.map(({ to, icon, key }) => (
              <DockTab
                key={to}
                to={to}
                icon={icon}
                labelKey={`nav.${key}`}
                active={isNavTabActive(pathname, to)}
                onClick={handleTabClick(to)}
              />
            ))}
          </div>

          <Link
            to={centerTab.to}
            preload="intent"
            onClick={handleTabClick(centerTab.to)}
            aria-label={t(`nav.${centerTab.key}`)}
            aria-current={aiActive ? "page" : undefined}
            className="relative mx-0.5 flex w-[62px] shrink-0 flex-col items-center justify-end pb-0.5"
          >
            <span
              className={cn(
                "grid size-[46px] place-items-center rounded-full border-2 shadow-soft transition-transform active:scale-95",
                aiActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-foreground text-background",
              )}
            >
              <CenterIcon className="size-[22px]" strokeWidth={2.25} />
            </span>
            <span
              className={cn(
                "mt-1 max-w-full truncate text-[10px] font-semibold leading-none",
                aiActive ? "text-foreground" : "text-muted-foreground",
              )}
              suppressHydrationWarning
            >
              {t(`nav.${centerTab.key}`)}
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 items-stretch">
            {rightTabs.map(({ to, icon, key }) => (
              <DockTab
                key={to}
                to={to}
                icon={icon}
                labelKey={`nav.${key}`}
                active={isNavTabActive(pathname, to)}
                onClick={handleTabClick(to)}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
