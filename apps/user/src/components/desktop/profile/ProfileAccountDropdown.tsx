import { User } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useDisplayUser } from "@/hooks/use-me";
import { isAccountNavActive, ACCOUNT_NAV_SECTIONS } from "@/lib/account-nav";
import { cn } from "@/lib/utils";
import { AccountNavList } from "./AccountNavList";

type Props = {
  notificationsUnread?: number;
};

export function ProfileAccountDropdown({ notificationsUnread: notificationsUnreadProp }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useDisplayUser();
  const { handleLogout } = useProfileScreen();
  const { data: notifications = [] } = useNotificationsApi();
  const unreadCount =
    notificationsUnreadProp ?? notifications.filter((notification) => !notification.read).length;

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileActive =
    pathname.startsWith("/account/") ||
    ACCOUNT_NAV_SECTIONS.some((section) =>
      section.items.some((item) => isAccountNavActive(pathname, item.to)),
    );

  const triggerClass = cn(
    "relative inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 font-bold transition-colors",
    profileActive
      ? "bg-foreground text-background shadow-sm"
      : "text-muted-foreground hover:bg-background hover:text-foreground",
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={triggerClass}
        aria-label={t("nav.profile")}
        title={t("nav.profile")}
      >
        {initials ? (
          <span
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold leading-none",
              profileActive ? "bg-background text-foreground" : "bg-foreground/10 text-foreground",
            )}
          >
            {initials}
          </span>
        ) : (
          <User className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-2rem,300px)] rounded-xl border border-border/80 bg-background p-0 shadow-[0_6px_20px_rgba(15,15,15,0.12)]"
      >
        <AccountNavList
          t={t}
          unreadNotifications={unreadCount}
          onLogout={handleLogout}
          variant="dropdown"
          onNavigate={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
