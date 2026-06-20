import { Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CalendarCheck,
  ChevronRight,
  Heart,
  Sparkles,
  Star,
  Tag,
  Wallet,
} from "lucide-react";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import {
  formatWalletStat,
  ProfileDesktopStatGrid,
} from "@/components/desktop/profile/ProfileDesktopStatGrid";
import { DESKTOP_GLASS_CARD } from "@/components/desktop/ui/desktop-glass";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useWalletBalance } from "@/hooks/use-wallet";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { cn } from "@/lib/utils";

export function ProfileDesktopPage() {
  const { t } = useAppTranslation();
  const { nextBooking, user, stats } = useProfileScreen();
  const { balance, isLoading: walletLoading } = useWalletBalance();
  const { data: notifications = [] } = useNotificationsApi();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const when = nextBooking ? formatBookingWhen(nextBooking.date) : null;

  const statTiles = [
    {
      label: t("profile.bookings"),
      value: String(stats?.bookingsCount ?? 0),
      to: "/bookings",
      icon: CalendarCheck,
    },
    {
      label: t("favorites.title", { defaultValue: "Sevimlilar" }),
      value: String(stats?.favoritesCount ?? 0),
      to: "/favorites",
      icon: Heart,
    },
    {
      label: t("reviews.title", { defaultValue: "Sharhlar" }),
      value: String(stats?.reviewsCount ?? 0),
      to: "/reviews",
      icon: Star,
    },
    {
      label: t("profile.wallet"),
      value: formatWalletStat(balance, walletLoading),
      to: "/wallet",
      icon: Wallet,
      highlight: true,
    },
  ];

  return (
    <AccountDesktopShell bare>
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("profile.desktop.eyebrow", { defaultValue: "Hisob markazi" })}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t("profile.desktop.greeting", {
            defaultValue: "Salom, {{name}}",
            name: user.firstName || user.name.split(" ")[0] || user.name,
          })}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {t("profile.desktop.subtitle", {
            defaultValue: "Buyurtmalar, to'lovlar va shaxsiy sozlamalarni bir joydan boshqaring.",
          })}
        </p>
      </header>

      <div className="mt-8 space-y-8">
        <ProfileDesktopStatGrid tiles={statTiles} />

        <section>
          {nextBooking && when ? (
            <Link
              to="/bookings"
              search={{ focus: nextBooking.id }}
              className="group flex items-center gap-5 rounded-2xl border border-foreground/10 bg-foreground/95 p-6 text-background shadow-[0_12px_40px_-12px_rgba(15,15,15,0.35)] backdrop-blur-sm transition-opacity hover:opacity-[0.97]"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-background/15">
                <Calendar className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-background/60">
                  {t("profile.nextBooking.title")}
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight">{nextBooking.salonName}</p>
                <p className="mt-1 text-sm text-background/75">
                  {when.date} · {when.time}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-background/50 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <div
              className={cn(
                DESKTOP_GLASS_CARD,
                "flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between",
              )}
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-background/70 backdrop-blur-sm">
                  <Sparkles className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-bold">{t("profile.nextBooking.empty")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("profile.nextBooking.emptyHint")}</p>
                </div>
              </div>
              <Link
                to="/explore"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background"
              >
                {t("profile.nextBooking.browse")}
              </Link>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/offers" className={cn(DESKTOP_GLASS_CARD, "flex items-center gap-4 p-4")}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/70 backdrop-blur-sm">
              <Tag className="h-5 w-5" strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("profile.offers")}</p>
              <p className="text-xs text-muted-foreground">{t("profile.desktop.comingSoon", { defaultValue: "Tez orada" })}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link to="/notifications" className={cn(DESKTOP_GLASS_CARD, "flex items-center gap-4 p-4")}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/70 backdrop-blur-sm">
              <Bell className="h-5 w-5" strokeWidth={1.9} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("notifications.title")}</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? t("profile.desktop.unreadCount", {
                      count: unreadCount,
                      defaultValue: "{{count}} ta o'qilmagan",
                    })
                  : t("profile.desktop.allRead", { defaultValue: "Hammasi o'qilgan" })}
              </p>
            </div>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-bold text-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </Link>
        </section>
      </div>
    </AccountDesktopShell>
  );
}
