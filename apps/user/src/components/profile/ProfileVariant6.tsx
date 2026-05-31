import { useState } from "react";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { NextBookingCard } from "@/components/profile/NextBookingCard";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileMenuSection } from "@/components/profile/ProfileMenuSection";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { PROFILE_MENU_SECTIONS } from "@/lib/profile-menu-sections";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "activity", labelKey: "profile.tabs.activity", index: 0 },
  { key: "payments", labelKey: "profile.tabs.payments", index: 1 },
  { key: "household", labelKey: "profile.tabs.household", index: 2 },
  { key: "app", labelKey: "profile.tabs.app", index: 3 },
] as const;

/** Tab ichida tab — gorizontal bo'limlar (Airbnb uslubi). */
export function ProfileVariant6() {
  const { t } = useTranslation();
  const { audience, stats, loading, nextBooking, handleLogout } = useProfileScreen();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("activity");

  const activeSection = PROFILE_MENU_SECTIONS[TABS.find((tab) => tab.key === activeTab)!.index];

  const statLinks = [
    { label: t("profile.bookings"), value: stats?.bookingsCount, to: "/bookings" },
    { label: t("profile.reviews"), value: stats?.reviewsCount, to: "/reviews" },
    { label: t("profile.favorites"), value: stats?.favoritesCount, to: "/favorites" },
  ];

  const menuItems = activeSection.items.map((item, i) => ({
    ...item,
    label: t(activeSection.labelKeys[i] ?? ""),
  }));

  return (
    <>
      <PageHeader title={t("profile.title")} />
      <ProfileIdentity audience={audience} />
      <NextBookingCard booking={nextBooking} />
      <ProfileStatsRow loading={loading} links={statLinks} />

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2.5 text-[12px] font-bold transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <ProfileMenuSection title="" items={menuItems} />

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
