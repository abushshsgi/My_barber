import { Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CalendarCheck,
  ChevronRight,
  Headphones,
  Info,
  LogOut,
  MapPin,
  Settings,
  Shield,
  Sparkles,
  Tag,
} from "lucide-react";
import { ProfileGoMenuGroup, ProfileGoQuickRow, ProfileWalletCard } from "@/components/profile/ProfileGroupedMenu";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useWalletBalance } from "@/hooks/use-wallet";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice } from "@/lib/mock-data";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";

export function ProfileDesktopPage() {
  const { t } = useAppTranslation();
  const { audience, nextBooking, user, stats, handleLogout } = useProfileScreen();
  const { balance, isLoading: walletLoading } = useWalletBalance();
  const { data: notifications = [] } = useNotificationsApi();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const audienceLabel = t(`audience.${audience}`);
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const when = nextBooking ? formatBookingWhen(nextBooking.date) : null;

  const quickItems = [
    { icon: CalendarCheck, label: t("profile.bookings"), to: "/bookings" },
    { icon: Headphones, label: t("profile.support"), to: "/support" },
    { icon: MapPin, label: t("profile.addresses"), to: "/addresses" },
    { icon: Settings, label: t("profile.settings"), to: "/settings" },
  ];

  return (
    <div>
      <DesktopPageHeader title={t("profile.title", { defaultValue: "Profil" })} />
      <div className="mt-8 grid grid-cols-[320px_1fr] gap-8 items-start">
        <aside className="sticky top-24 space-y-6">
          <div className="flex flex-col items-start gap-3">
            <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-surface">
              <span className="text-[36px] font-bold">{initials}</span>
            </div>
            <Link to="/settings" className="inline-flex items-center gap-1">
              <p className="text-[22px] font-bold">{user.name}</p>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
            <p className="text-sm text-muted-foreground">{user.phone}</p>
            <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted-foreground">
              {audienceLabel}
            </span>
            {stats ? (
              <p className="text-[11px] text-muted-foreground">
                {stats.bookingsCount} bron · {stats.favoritesCount} sevimli · {stats.reviewsCount} sharh
              </p>
            ) : null}
          </div>
          <ProfileGoQuickRow items={quickItems} />
          <ProfileWalletCard
            title={t("profile.wallet")}
            balance={walletLoading ? "…" : formatPrice(balance)}
          />
        </aside>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {ACCOUNT_HUBS.map((hub) => {
              const Icon = hub.icon;
              return (
                <Link
                  key={hub.key}
                  to={hub.to}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface/30 p-4 hover:bg-surface/60"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-background">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{t(hub.titleKey)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t(hub.descKey)}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <ProfileGoMenuGroup
            items={[{ icon: Tag, title: t("profile.offers"), subtitle: "Tez orada", to: "/offers" }]}
          />

          {nextBooking && when ? (
            <ProfileGoMenuGroup
              dark
              items={[
                {
                  icon: Calendar,
                  title: t("profile.nextBooking.title"),
                  subtitle: `${nextBooking.salonName} · ${when.date} · ${when.time}`,
                  to: "/bookings",
                  search: { focus: nextBooking.id },
                },
              ]}
            />
          ) : (
            <ProfileGoMenuGroup
              dark
              items={[{ icon: Sparkles, title: t("profile.loyalty"), subtitle: "Tez orada", to: "/loyalty" }]}
            />
          )}

          <ProfileGoMenuGroup
            items={[
              { icon: Shield, title: t("profile.privacy"), to: "/privacy" },
              {
                icon: Bell,
                title: t("notifications.title"),
                to: "/notifications",
                badge: unreadCount > 0 ? String(unreadCount > 9 ? "9+" : unreadCount) : undefined,
              },
            ]}
          />

          <ProfileGoMenuGroup items={[{ icon: Info, title: t("profile.info"), to: "/support" }]} />

          <button
            type="button"
            onClick={handleLogout}
            className="flex max-w-xs items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 text-sm font-bold text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
