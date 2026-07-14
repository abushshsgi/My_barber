import { Link } from "@tanstack/react-router";
import { Bell, CalendarCheck, Heart, MessageSquare, Settings, UserPlus, Wallet } from "lucide-react";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { ProfileAccountHubGrid, type AccountHubTile } from "@/components/desktop/profile/ProfileAccountHubGrid";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useWalletBalance } from "@/hooks/use-wallet";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { formatPrice } from "@/lib/mock-data";

export function ProfileDesktopPage() {
  const { t } = useAppTranslation();
  const { nextBooking, user, stats } = useProfileScreen();
  const { balance, isLoading: walletLoading } = useWalletBalance();
  const { data: notifications = [] } = useNotificationsApi();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const when = nextBooking ? formatBookingWhen(nextBooking.date) : null;
  const firstName = user.firstName || user.name.split(" ")[0] || user.name;
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const bookingsMeta =
    nextBooking && when
      ? `${nextBooking.salonName} · ${when.date}`
      : stats?.bookingsCount
        ? t("profile.desktop.hubs.bookings.metaCount", {
            count: stats.bookingsCount,
            defaultValue: "{{count}} ta buyurtma",
          })
        : t("profile.desktop.hubs.bookings.metaEmpty", { defaultValue: "Hali buyurtma yo'q" });

  const hubTiles: AccountHubTile[] = [
    {
      icon: CalendarCheck,
      title: t("profile.desktop.hubs.bookings.title", { defaultValue: "Buyurtmalar" }),
      description: t("profile.desktop.hubs.bookings.desc", {
        defaultValue: "Kelgusi va o'tgan uchrashuvlaringizni ko'ring va boshqaring.",
      }),
      to: "/bookings",
      meta: bookingsMeta,
      search: nextBooking ? { focus: nextBooking.id } : undefined,
    },
    {
      icon: Wallet,
      title: t("profile.desktop.hubs.wallet.title", { defaultValue: "Hamyon va to'lov" }),
      description: t("profile.desktop.hubs.wallet.desc", {
        defaultValue: "Balans, to'lov usullari, bonus va sovg'a kartalar.",
      }),
      to: "/wallet",
      meta: walletLoading
        ? "…"
        : t("profile.desktop.hubs.wallet.meta", {
            balance: formatPrice(balance),
            defaultValue: "{{balance}} balans",
          }),
    },
    {
      icon: Heart,
      title: t("profile.desktop.hubs.favorites.title", { defaultValue: "Sevimlilar" }),
      description: t("profile.desktop.hubs.favorites.desc", {
        defaultValue: "Saqlangan salonlar va sevimli ustalaringiz.",
      }),
      to: "/favorites",
      meta: t("profile.desktop.hubs.favorites.meta", {
        count: stats?.favoritesCount ?? 0,
        defaultValue: "{{count}} ta salon",
      }),
    },
    {
      icon: MessageSquare,
      title: t("profile.desktop.hubs.reviews.title", { defaultValue: "Sharhlar" }),
      description: t("profile.desktop.hubs.reviews.desc", {
        defaultValue: "Salonlarga qoldirgan fikr-mulohazalaringiz.",
      }),
      to: "/reviews",
      meta: t("profile.desktop.hubs.reviews.meta", {
        count: stats?.reviewsCount ?? 0,
        defaultValue: "{{count}} ta sharh",
      }),
    },
    {
      icon: Bell,
      title: t("profile.desktop.hubs.notifications.title", { defaultValue: "Bildirishnomalar" }),
      description: t("profile.desktop.hubs.notifications.desc", {
        defaultValue: "Buyurtma eslatmalari va chat xabarlari sozlamalari.",
      }),
      to: "/notifications",
      meta:
        unreadCount > 0
          ? t("profile.desktop.unreadCount", {
              count: unreadCount,
              defaultValue: "{{count}} ta o'qilmagan",
            })
          : t("profile.desktop.allRead", { defaultValue: "Hammasi o'qilgan" }),
      badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : undefined,
    },
    {
      icon: UserPlus,
      title: t("referral.title", { defaultValue: "Referrals" }),
      description: t("referral.subtitle", {
        defaultValue: "Do'st va oilangizni MySaloon'ga taklif qiling.",
      }),
      to: "/referrals",
      meta: t("referral.share", { defaultValue: "Havolani ulashish" }),
    },
    {
      icon: Settings,
      title: t("profile.desktop.hubs.settings.title", { defaultValue: "Hisob sozlamalari" }),
      description: t("profile.desktop.hubs.settings.desc", {
        defaultValue: "Shaxsiy ma'lumotlar, manzillar, til va maxfiylik.",
      }),
      to: "/settings",
      meta: t("profile.desktop.hubs.settings.meta", {
        defaultValue: "Profil, manzil va xavfsizlik",
      }),
    },
  ];

  return (
    <AccountDesktopShell bare wide>
      <header className="border-b border-border/70 pb-8">
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">
          {t("profile.desktop.pageTitle", { defaultValue: "Mening hisobim" })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("profile.desktop.pageLead", {
            defaultValue: "Salom, {{name}} — barcha sozlamalarni shu yerdan boshqaring.",
            name: firstName,
          })}
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface text-lg font-semibold text-foreground ring-1 ring-border">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-foreground">{user.name}</p>
            {user.phone ? <p className="truncate text-sm text-muted-foreground">{user.phone}</p> : null}
          </div>
          <Link
            to="/settings"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            {t("profile.editProfile", { defaultValue: "Profilni tahrirlash" })}
          </Link>
        </div>
      </header>

      <section className="pt-8">
        <ProfileAccountHubGrid tiles={hubTiles} />
      </section>
    </AccountDesktopShell>
  );
}
