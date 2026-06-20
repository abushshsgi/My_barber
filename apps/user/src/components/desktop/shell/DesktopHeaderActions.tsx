import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileAccountDropdown } from "@/components/desktop/profile/ProfileAccountDropdown";
import { isNavTabActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Props = {
  notificationsUnread?: number;
  chatUnread?: number;
};

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold leading-none text-background ring-2 ring-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function DesktopHeaderActions({ notificationsUnread = 0, chatUnread = 0 }: Props) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const notificationsActive = isNavTabActive(pathname, "/notifications");
  const chatActive = isNavTabActive(pathname, "/chat");

  const itemClass = (active: boolean) =>
    cn(
      "relative inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition-colors",
      "h-9 min-w-9 px-2.5 text-[12px]",
      active
        ? "bg-foreground text-background shadow-sm"
        : "text-muted-foreground hover:bg-background hover:text-foreground",
    );

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-1"
      role="toolbar"
      aria-label={t("nav.account", { defaultValue: "Hisob" })}
    >
      <Link
        to="/notifications"
        className={itemClass(notificationsActive)}
        aria-label={t("nav.notifications")}
        title={t("nav.notifications")}
      >
        <Bell className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <Badge count={notificationsUnread} />
      </Link>

      <Link
        to="/chat"
        className={cn(itemClass(chatActive), "px-3")}
        aria-label={t("nav.chat")}
        title={t("nav.chat")}
      >
        <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="hidden sm:inline">{t("nav.chat")}</span>
        <Badge count={chatUnread} />
      </Link>

      <ProfileAccountDropdown notificationsUnread={notificationsUnread} />
    </div>
  );
}
