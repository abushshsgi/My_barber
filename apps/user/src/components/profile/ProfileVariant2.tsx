import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { AccountHubCard } from "@/components/profile/AccountHubCard";
import { NextBookingCard } from "@/components/profile/NextBookingCard";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";

/** Hub layout — 4 ta kategoriya (Google Account uslubi). */
export function ProfileVariant2() {
  const { t } = useTranslation();
  const { audience, stats, loading, nextBooking, handleLogout } = useProfileScreen();

  const statLinks = [
    { label: t("profile.bookings"), value: stats?.bookingsCount, to: "/bookings" },
    { label: t("profile.reviews"), value: stats?.reviewsCount, to: "/reviews" },
    { label: t("profile.favorites"), value: stats?.favoritesCount, to: "/favorites" },
  ];

  return (
    <>
      <PageHeader title={t("profile.title")} />
      <ProfileIdentity audience={audience} />
      <NextBookingCard booking={nextBooking} />
      <ProfileStatsRow loading={loading} links={statLinks} />

      <section className="mt-6 px-5">
        <h2 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("account.myAccount")}
        </h2>
        <div className="flex flex-col gap-2">
          {ACCOUNT_HUBS.map((hub) => (
            <AccountHubCard
              key={hub.key}
              to={hub.to}
              icon={hub.icon}
              titleKey={hub.titleKey}
              descKey={hub.descKey}
            />
          ))}
        </div>
      </section>

      <div className="mt-6 px-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 text-sm font-bold text-muted-foreground active:bg-surface"
        >
          <LogOut className="h-4 w-4" />
          {t("common.logout")}
        </button>
      </div>
    </>
  );
}
