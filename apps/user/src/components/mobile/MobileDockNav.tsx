import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bot,
  Compass,
  Droplets,
  FlaskConical,
  Home,
  Map,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MysaloonAppMark } from "@/components/brand/MysaloonAppMark";
import { useAppShell } from "@/hooks/use-app-shell";
import { isNavTabActive, isNavTabCurrent } from "@/lib/navigation";
import { shouldShowMobileDock } from "@/lib/layout-routes";
import { prefetchMorphAiIntroVideo } from "@/lib/morph-ai-intro";
import { hapticLight } from "@/lib/native-haptics";
import { cn } from "@/lib/utils";

const mysaloonLeftTabs = [
  { to: "/", icon: Home, key: "home" },
  { to: "/map", icon: Map, key: "map" },
] as const;

const mysaloonRightTabs = [
  { to: "/explore", icon: Compass, key: "explore" },
  { to: "/profile", icon: User, key: "profile" },
] as const;

const morphLeftTabs = [
  { to: "/ai-style/chat", icon: Bot, key: "morphChat" },
  { to: "/ai-style/care", icon: Droplets, key: "morphCare" },
  { to: "/ai-style/care/ingredient", icon: FlaskConical, key: "morphIngredient" },
] as const;

const morphRightTabs = [
  { to: "/ai-style", icon: Sparkles, key: "morphTryOn" },
  { to: "/ai-style/studio", icon: Wand2, key: "morphStudio" },
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
  compact,
  onClick,
}: {
  to: string;
  icon: DockIcon;
  labelKey: string;
  active: boolean;
  compact?: boolean;
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
      className={cn(
        "group flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "px-0.5" : "px-1",
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-xl transition",
          compact ? "size-8" : "size-9",
          active
            ? "bg-foreground text-background"
            : "text-muted-foreground group-active:text-foreground",
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} strokeWidth={active ? 2.25 : 2} />
      </span>
      <span
        className={cn(
          "max-w-full truncate font-semibold leading-none",
          compact ? "text-[9px]" : "text-[10px]",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        suppressHydrationWarning
      >
        {t(labelKey)}
      </span>
    </Link>
  );
}

/** Mobil pastki navigatsiya — MySaloon yoki Morph AI shell. */
export function MobileDockNav({ unreadCount: _unreadCount = 0 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { shell, switchToMorph, switchToMysaloon } = useAppShell();
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const compact = shell === "morph";

  useEffect(() => {
    preloadRoutes.forEach((tab) => {
      void router.preloadRoute({ to: tab.to });
    });
    prefetchMorphAiIntroVideo();
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-xl lg:hidden"
      aria-label={shell === "morph" ? "Morf AI navigatsiya" : "Asosiy navigatsiya"}
    >
      <div className="relative flex min-h-[56px] items-end px-0.5 pb-[env(safe-area-inset-bottom,0px)] pt-1">
        <div className="flex min-w-0 flex-1 items-stretch">
          {leftTabs.map(({ to, icon, key }) => (
            <DockTab
              key={to}
              to={to}
              icon={icon}
              labelKey={`nav.${key}`}
              active={isNavTabActive(pathname, to)}
              compact={compact}
              onClick={handleTabClick(to)}
            />
          ))}
        </div>

        {shell === "morph" ? (
          <button
            type="button"
            onClick={switchToMysaloon}
            aria-label={t("nav.mysaloon")}
            className="relative mx-0.5 flex w-[58px] shrink-0 flex-col items-center justify-end pb-0.5"
          >
            <span className="grid size-[46px] place-items-center rounded-full border-2 border-border bg-background shadow-soft transition-transform active:scale-95">
              <MysaloonAppMark size={28} tone="onLight" useImage />
            </span>
            <span
              className="mt-1 max-w-full truncate text-[9px] font-semibold leading-none text-muted-foreground"
              suppressHydrationWarning
            >
              {t("nav.mysaloon")}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={switchToMorph}
            aria-label={t("nav.aiStyle")}
            className="relative mx-0.5 flex w-[62px] shrink-0 flex-col items-center justify-end pb-0.5"
          >
            <span className="grid size-[46px] place-items-center rounded-full border-2 border-border bg-foreground text-background shadow-soft transition-transform active:scale-95">
              <Wand2 className="size-[22px]" strokeWidth={2.25} />
            </span>
            <span
              className="mt-1 max-w-full truncate text-[10px] font-semibold leading-none text-muted-foreground"
              suppressHydrationWarning
            >
              {t("nav.aiStyle")}
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
              compact={compact}
              onClick={handleTabClick(to)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
