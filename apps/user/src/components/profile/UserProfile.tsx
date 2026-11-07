import { Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  Info,
  LogOut,
  MapPin,
  Settings,
  Shield,
  Sparkles,
  Star,
  Tag,
  Wallet,
} from "lucide-react";
import { ProfileGoMenuGroup } from "@/components/profile/ProfileGroupedMenu";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useWalletBalance } from "@/hooks/use-wallet";
import { hasValidUserSession } from "@/lib/api/client";
import { formatPrice } from "@/lib/mock-data";

/** MySaloon profili — ilovadagi MysaloonProfileHome. Desktop: ProfileDesktopPage. */
export function UserProfile() {
  const { t } = useAppTranslation();
  const { user, stats, handleLogout } = useProfileScreen();
  const { balance, isLoading: walletLoading } = useWalletBalance();
  const { data: notifications = [] } = useNotificationsApi();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const loggedIn = hasValidUserSession();
  const bookings = stats?.bookingsCount ?? 0;
  const favorites = stats?.favoritesCount ?? 0;

  const quick = [
    { icon: Calendar, label: t("profile.bookings"), to: "/bookings" as const },
    { icon: Bell, label: t("notifications.title", { defaultValue: "Xabarlar" }), to: "/notifications" as const },
    { icon: MapPin, label: t("profile.addresses"), to: "/addresses" as const },
    { icon: Settings, label: t("profile.settings"), to: "/settings" as const },
  ];

  return (
    <div className="min-h-[70vh] bg-background px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-bold">
          <Star className="size-3.5" />
          {t("profile.bonusSoon", { defaultValue: "Bonus · tez orada" })}
        </span>
        <Link
          to="/subscriptions"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold text-background"
        >
          <Sparkles className="size-3.5" />
          {t("profile.subscription", { defaultValue: "Obuna" })}
        </Link>
      </div>

      <div className="mt-5 flex flex-col items-center text-center">
        <UserAvatar name={user.name} src={user.avatar} size={88} editable={loggedIn} />
        <Link to="/settings" className="mt-3 inline-flex max-w-full items-center gap-1">
          <span className="truncate text-[22px] font-bold tracking-tight">{user.name}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
        <span className="mt-2 rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-muted-foreground">
          MySaloon
        </span>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
          {t("profile.statsLine", {
            bookings,
            favorites,
            defaultValue: "{{bookings}} bron · {{favorites}} sevimli",
          })}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {quick.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="flex flex-col items-center gap-2 py-1 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-surface">
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        <ProfileGoMenuGroup
          dark
          items={[
            {
              icon: Wallet,
              title: t("profile.wallet"),
              subtitle: walletLoading ? "…" : formatPrice(balance),
              to: "/wallet",
            },
          ]}
        />
        <ProfileGoMenuGroup
          items={[
            {
              icon: Calendar,
              title: t("profile.activity", { defaultValue: "Faoliyat" }),
              subtitle: t("profile.activitySub", { defaultValue: "Buyurtmalar va tarix" }),
              to: "/bookings",
            },
            {
              icon: Tag,
              title: t("profile.promos", { defaultValue: "Aksiyalar" }),
              subtitle: t("profile.soon", { defaultValue: "Tez orada" }),
              to: "/offers",
            },
          ]}
        />
        <ProfileGoMenuGroup
          dark
          items={[
            {
              icon: Sparkles,
              title: t("profile.bonusProgram", { defaultValue: "Bonus dasturi" }),
              subtitle: t("profile.soon", { defaultValue: "Tez orada" }),
              to: "/loyalty",
            },
          ]}
        />
        <ProfileGoMenuGroup
          items={[
            { icon: Shield, title: t("profile.privacy"), to: "/privacy-policy" },
            { icon: FileText, title: t("profile.terms", { defaultValue: "Foydalanish shartlari" }), to: "/terms-of-use" },
            {
              icon: Bell,
              title: t("notifications.title", { defaultValue: "Bildirishnomalar" }),
              to: "/notifications",
              badge: unreadCount > 0 ? String(unreadCount > 9 ? "9+" : unreadCount) : undefined,
            },
          ]}
        />
        <ProfileGoMenuGroup
          items={[{ icon: Info, title: t("profile.about", { defaultValue: "Ma'lumot" }), to: "/support" }]}
        />
      </div>

      {loggedIn ? (
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-4 text-sm font-bold"
        >
          <LogOut className="size-4" />
          {t("common.logout", { defaultValue: "Chiqish" })}
        </button>
      ) : (
        <Link
          to="/auth"
          className="mt-4 flex w-full items-center justify-center rounded-full bg-foreground py-4 text-sm font-bold text-background"
        >
          {t("common.login", { defaultValue: "Kirish" })}
        </Link>
      )}
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        {t("profile.guestHint", { defaultValue: "Shu akkaunt MySaloon bronlari uchun ishlaydi" })}
      </p>
    </div>
  );
}
