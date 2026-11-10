import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Droplet, Home, MessageCircle, Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppShell } from "@/hooks/use-app-shell";
import { isNavTabActive, isNavTabCurrent } from "@/lib/navigation";
import { shouldShowMobileDock } from "@/lib/layout-routes";
import { hapticLight } from "@/lib/native-haptics";
import { cn } from "@/lib/utils";

/** MySaloon — Asosiy va Profil. Xarita va kashfiyot dockda yo‘q. */
const mysaloonLeftTabs = [{ to: "/", icon: Home, key: "home" }] as const;

const mysaloonRightTabs = [{ to: "/profile", icon: User, key: "profile" }] as const;

/** Morf — Chat, Parvarish | Try-on, Profil. Tarkib parvarishdan ochiladi. */
const morphLeftTabs = [
  { to: "/ai-style/chat", icon: MessageCircle, key: "morphChat" },
  { to: "/ai-style/care", icon: Droplet, key: "morphCare" },
] as const;

const morphRightTabs = [
  { to: "/ai-style", icon: Sparkles, key: "morphTryOn" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

const preloadRoutes = [
  ...mysaloonLeftTabs,
  ...mysaloonRightTabs,
  ...morphLeftTabs,
  ...morphRightTabs,
  { to: "/ai-style" },
] as const;

type DockIcon = typeof Home;

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
  icon: DockIcon;
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
      className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 px-[clamp(1px,0.6vw,4px)] pb-[clamp(0.2rem,1vw,0.4rem)] outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon
        className={cn(
          "size-[clamp(18px,5.4vw,22px)] transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-active:text-foreground",
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span
        className={cn(
          "max-w-full truncate text-[clamp(9px,2.55vw,11px)] leading-none tracking-tight",
          active ? "font-bold text-foreground" : "font-semibold text-muted-foreground",
        )}
        suppressHydrationWarning
      >
        {t(labelKey)}
      </span>
    </Link>
  );
}

function MorfDockMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-[22px]" aria-hidden>
      <path
        fill="currentColor"
        d="M16 2.5c.6 4.8 2.2 8.2 5.6 11.4C25.2 17.3 28.6 18.8 32 19.4c-3.4.6-6.8 2.1-10.4 5.5-3.4 3.2-5 6.6-5.6 11.4-.6-4.8-2.2-8.2-5.6-11.4C6.8 21.5 3.4 20 0 19.4c3.4-.6 6.8-2.1 10.4-5.5C13.8 10.7 15.4 7.3 16 2.5Z"
      />
    </svg>
  );
}

/** Mobil pastki navigatsiya — MySaloon yoki Morf AI shell. */
export function MobileDockNav({ unreadCount: _unreadCount = 0 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { shell, switchToMorph, switchToMysaloon } = useAppShell();
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);

  useEffect(() => {
    preloadRoutes.forEach((tab) => {
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

  if (!shouldShowMobileDock(pathname) || faceCameraOpen) {
    return null;
  }

  const handleTabClick = (to: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    void hapticLight();
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

  const leftTabs = shell === "morph" ? morphLeftTabs : mysaloonLeftTabs;
  const rightTabs = shell === "morph" ? morphRightTabs : mysaloonRightTabs;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 h-[var(--mobile-dock,calc(3.25rem+env(safe-area-inset-bottom,0px)))] border-t border-black/15 bg-white lg:hidden"
      aria-label={shell === "morph" ? "Morf AI navigatsiya" : "Asosiy navigatsiya"}
    >
      <div className="relative flex h-full items-end px-[clamp(2px,1vw,6px)] pb-[max(0.2rem,env(safe-area-inset-bottom,0px))]">
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

        {shell === "morph" ? (
          <button
            type="button"
            onClick={switchToMysaloon}
            aria-label={t("nav.mysaloon")}
            className="relative z-10 mx-[clamp(1px,0.6vw,4px)] flex w-[clamp(44px,13vw,56px)] shrink-0 items-center justify-center self-center active:scale-95"
          >
            <span className="grid size-[clamp(34px,10vw,42px)] place-items-center overflow-hidden rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.16)] ring-2 ring-white">
              <img
                src="/icon-192.png"
                alt=""
                width={42}
                height={42}
                className="size-full object-cover"
                draggable={false}
                loading="lazy"
                decoding="async"
              />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={switchToMorph}
            aria-label={t("nav.aiStyle")}
            className="relative z-10 mx-[clamp(1px,0.6vw,4px)] flex w-[clamp(44px,13vw,56px)] shrink-0 items-center justify-center self-center active:scale-95"
          >
            <span className="grid size-[clamp(34px,10vw,42px)] place-items-center rounded-full bg-[#1e1e1e] text-white shadow-[0_2px_10px_rgba(0,0,0,0.22)] ring-2 ring-white">
              <MorfDockMark />
            </span>
          </button>
        )}

        <div className="flex min-w-0 flex-1 items-stretch">
          {rightTabs.map(({ to, icon, key }) => (
            <DockTab
              key={`${key}-${to}`}
              to={to}
              icon={icon}
              labelKey={`nav.${key}`}
              active={isNavTabActive(pathname, to)}
              onClick={handleTabClick(to)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
