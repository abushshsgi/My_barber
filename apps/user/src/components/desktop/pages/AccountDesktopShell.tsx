import { ProfileDesktopSidebar } from "@/components/desktop/profile/ProfileDesktopSidebar";
import { DESKTOP_ACCOUNT_BG, DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useRegions } from "@/hooks/use-regions";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  bare?: boolean;
};

export function AccountDesktopShell({ title, subtitle, children, bare }: Props) {
  const { t } = useAppTranslation();
  const { audience, user, handleLogout } = useProfileScreen();
  const { data: notifications = [] } = useNotificationsApi();
  const { data: regions = [] } = useRegions();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const audienceLabel = t(`audience.${audience}`);
  const regionLabel = regions.find((r) => r.value === user.region)?.label;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn("mx-auto w-full max-w-5xl", DESKTOP_ACCOUNT_BG)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <ProfileDesktopSidebar
          name={user.name}
          phone={user.phone}
          initials={initials}
          audienceLabel={audienceLabel}
          regionLabel={regionLabel}
          onLogout={handleLogout}
          unreadNotifications={unreadCount}
          t={t}
        />

        <div className="min-w-0 flex-1">
          {title ? (
            <header className="mb-5">
              <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
              {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
            </header>
          ) : null}

          {bare ? (
            children
          ) : (
            <div className={cn(DESKTOP_GLASS_PANEL, "p-5 lg:p-6")}>{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
