import { Link, useRouterState } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { getPageTitleKey, showsAudienceInTopBar } from "@/lib/layout-routes";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function DesktopTopBar({ className }: Props) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { notificationsUnread } = useNavBadges();
  const titleKey = getPageTitleKey(pathname);
  const showAudience = showsAudienceInTopBar(pathname);

  if (!titleKey && !showAudience) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/95 px-6 backdrop-blur-md lg:flex",
        className,
      )}
    >
      <div className="min-w-0">
        {titleKey ? (
          <h1 className="truncate text-base font-bold tracking-tight" suppressHydrationWarning>
            {t(titleKey, { defaultValue: titleKey })}
          </h1>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {showAudience ? <AudienceSwitch /> : null}
        <Link
          to="/notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-surface transition-colors hover:bg-surface/80"
          aria-label={t("nav.notifications")}
        >
          <Bell className="h-4 w-4" strokeWidth={2.2} />
          {notificationsUnread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
              {notificationsUnread > 9 ? "9+" : notificationsUnread}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
