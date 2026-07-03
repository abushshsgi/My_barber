import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, Home, Map, User, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
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

const HIDE_ON = ["/auth", "/ai-style"];

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
      className="group relative flex min-h-[44px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
    >
      {active ? (
        <motion.span
          layoutId="user-dock-active"
          transition={{ type: "spring", stiffness: 480, damping: 40 }}
          className="absolute inset-x-0.5 top-0.5 bottom-0.5 -z-0 rounded-xl border border-border bg-primary"
        />
      ) : null}
      <span
        className={cn(
          "relative z-10 grid h-7 w-7 place-items-center transition",
          active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
      </span>
      <span
        className={cn(
          "relative z-10 text-[9px] font-bold uppercase tracking-wide",
          active ? "text-primary-foreground" : "text-muted-foreground",
        )}
        suppressHydrationWarning
      >
        {t(labelKey)}
      </span>
    </Link>
  );
}

/** Mobil dock — markazda kattaroq AI Style tugmasi. */
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

  const CenterIcon = centerTab.icon;
  const aiActive = isNavTabActive(pathname, centerTab.to);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="pointer-events-auto relative w-full max-w-md">
        <div className="pointer-events-none absolute inset-x-10 -top-3 h-px gold-divider opacity-50" />

        <Link
          to={centerTab.to}
          preload="intent"
          onClick={handleTabClick(centerTab.to)}
          aria-label={t(`nav.${centerTab.key}`)}
          aria-current={aiActive ? "page" : undefined}
          className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-[42%] flex-col items-center gap-1"
        >
          <span
            className={cn(
              "grid size-[58px] place-items-center rounded-full border-2 shadow-dock transition-transform active:scale-95",
              aiActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-foreground text-background",
            )}
          >
            <CenterIcon className="size-[27px]" strokeWidth={2.25} />
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              aiActive ? "bg-foreground text-background" : "bg-surface text-foreground",
            )}
            suppressHydrationWarning
          >
            {t(`nav.${centerTab.key}`)}
          </span>
        </Link>

        <div className="relative flex items-stretch rounded-[24px] border border-border bg-surface px-1.5 pb-1.5 pt-2 shadow-dock">
          <div className="flex min-w-0 flex-1 items-stretch pr-[34px]">
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
          <div className="w-[52px] shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-1 items-stretch pl-[34px]">
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
