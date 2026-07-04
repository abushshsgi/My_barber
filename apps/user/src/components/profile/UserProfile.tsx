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
import {
  ProfileGoMenuGroup,
  ProfileGoQuickRow,
  ProfileWalletCard,
} from "@/components/profile/ProfileGroupedMenu";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useWalletBalance } from "@/hooks/use-wallet";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice } from "@/lib/mock-data";

/** Profil sahifasi — faqat mobil UI. Desktop: ProfileDesktopPage. */
export function UserProfile() {
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
    <div className="min-h-[70vh] bg-background pb-4 pt-[calc(env(safe-area-inset-top)+6px)]">
      <div className="flex items-center justify-between px-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Bonus · tez orada
        </span>
      </div>

      <div className="mt-2 flex flex-col items-center px-5 text-center">
        <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-surface">
          <span className="text-[36px] font-bold leading-none">{initials}</span>
        </div>
        <Link to="/settings" className="mt-4 inline-flex max-w-full items-center gap-1">
          <p className="truncate text-[22px] font-bold tracking-tight">{user.name}</p>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
        <p className="mt-1 text-[15px] font-medium text-muted-foreground">{user.phone}</p>
        <span className="mt-2 rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted-foreground">
          {audienceLabel}
        </span>
        {stats ? (
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
            {stats.bookingsCount} bron · {stats.favoritesCount} sevimli · {stats.reviewsCount} sharh
          </p>
        ) : null}
      </div>

      <div className="mt-7 px-3">
        <ProfileGoQuickRow items={quickItems} />
      </div>

      <div className="mt-6 px-4">
        <ProfileWalletCard
          title={t("profile.wallet")}
          balance={walletLoading ? "…" : formatPrice(balance)}
        />
      </div>

      <div className="mt-6 space-y-3 px-4">
        <ProfileGoMenuGroup
          items={[
            {
              icon: CalendarCheck,
              title: t("account.hubs.activity.title"),
              subtitle: t("account.hubs.activity.desc"),
              to: "/account/activity",
            },
          ]}
        />
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
                to: "/bookings/$bookingId",
                params: { bookingId: nextBooking.id },
              },
            ]}
          />
        ) : (
          <ProfileGoMenuGroup
            dark
            items={[
              {
                icon: Sparkles,
                title: t("profile.loyalty"),
                subtitle: "Tez orada",
                to: "/loyalty",
              },
            ]}
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background py-4 text-sm font-bold text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
