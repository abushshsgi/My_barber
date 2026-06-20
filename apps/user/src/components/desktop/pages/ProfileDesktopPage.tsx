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
import { ProfileDesktopHero } from "@/components/desktop/profile/ProfileDesktopHero";
import { ProfileDesktopHubCard } from "@/components/desktop/profile/ProfileDesktopHubCard";
import { ProfileDesktopQuickActions } from "@/components/desktop/profile/ProfileDesktopQuickActions";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useWalletBalance } from "@/hooks/use-wallet";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";
import { formatBookingWhen } from "@/lib/bookings-utils";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      <DesktopPageHeader title={t("profile.title", { defaultValue: "Profil" })} />

      <ProfileDesktopHero
        name={user.name}
        phone={user.phone}
        audienceLabel={audienceLabel}
        initials={initials}
        balance={balance}
        walletLoading={walletLoading}
        stats={stats}
      />

      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("profile.variant4.quickActions", { defaultValue: "Tez kirish" })}
        </h2>
        <ProfileDesktopQuickActions items={quickItems} />
      </section>

      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("account.hubMenuTitle", { defaultValue: "Bo'limlar" })}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ACCOUNT_HUBS.map((hub) => (
            <ProfileDesktopHubCard key={hub.key} hub={hub} t={t} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        {nextBooking && when ? (
          <Link
            to="/bookings"
            search={{ focus: nextBooking.id }}
            className="flex items-center gap-4 rounded-2xl bg-foreground p-5 text-background transition-opacity hover:opacity-95"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-background/15">
              <Calendar className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("profile.nextBooking.title")}</p>
              <p className="mt-1 truncate text-xs text-background/70">
                {nextBooking.salonName} · {when.date} · {when.time}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-background/50" />
          </Link>
        ) : (
          <Link
            to="/loyalty"
            className="flex items-center gap-4 rounded-2xl bg-foreground p-5 text-background transition-opacity hover:opacity-95"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-background/15">
              <Sparkles className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("profile.loyalty")}</p>
              <p className="mt-1 text-xs text-background/70">Tez orada</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-background/50" />
          </Link>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface/30">
          <Link
            to="/offers"
            className="flex items-center gap-3 border-b border-border px-4 py-3.5 hover:bg-surface/60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background">
              <Tag className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("profile.offers")}</p>
              <p className="text-xs text-muted-foreground">Tez orada</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            to="/notifications"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface/60"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background">
              <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("notifications.title")}</p>
            </div>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </Link>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center gap-6">
          <Link to="/privacy" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
            <Shield className="h-4 w-4" />
            {t("profile.privacy")}
          </Link>
          <Link to="/support" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
            <Info className="h-4 w-4" />
            {t("profile.info")}
          </Link>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl border-2 border-border px-5 py-3 text-sm font-bold text-muted-foreground",
            "hover:border-foreground/30 hover:text-foreground",
          )}
        >
          <LogOut className="h-4 w-4" />
          {t("common.logout")}
        </button>
      </footer>
    </div>
  );
}
