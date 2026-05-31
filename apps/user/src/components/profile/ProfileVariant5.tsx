import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { NextBookingCard } from "@/components/profile/NextBookingCard";
import { ProfileIdentityCentered } from "@/components/profile/ProfileIdentityCentered";
import { ProfileMenuSection } from "@/components/profile/ProfileMenuSection";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { PROFILE_MENU_SECTIONS } from "@/lib/profile-menu-sections";

/** To'liq ro'yxat — guruhlangan menu qatorlari (iOS Sozlamalar uslubi). */
export function ProfileVariant5() {
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
      <ProfileIdentityCentered audience={audience} />
      <NextBookingCard booking={nextBooking} />
      <ProfileStatsRow loading={loading} links={statLinks} />

      {PROFILE_MENU_SECTIONS.map((section) => (
        <ProfileMenuSection
          key={section.titleKey}
          title={t(section.titleKey)}
          items={section.items.map((item, i) => ({
            ...item,
            label: t(section.labelKeys[i] ?? ""),
          }))}
        />
      ))}

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
