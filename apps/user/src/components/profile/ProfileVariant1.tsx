import { Link } from "@tanstack/react-router";
import { HelpCircle, LogOut, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { NextBookingCard } from "@/components/profile/NextBookingCard";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { useProfileScreen } from "@/components/profile/useProfileScreen";

/** Minimal profil — identity, keyingi bron, stat, sozlamalar. */
export function ProfileVariant1() {
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

      <div className="mt-6 grid grid-cols-2 gap-2 px-5">
        <Link
          to="/settings"
          className="flex items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-bold text-background active:scale-[0.98]"
        >
          <Settings className="h-4 w-4" />
          {t("profile.settings")}
        </Link>
        <Link
          to="/support"
          className="flex items-center justify-center gap-2 rounded-2xl border border-border py-4 text-sm font-bold active:bg-surface"
        >
          <HelpCircle className="h-4 w-4" />
          {t("profile.support")}
        </Link>
      </div>

      <div className="mt-4 px-5">
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
