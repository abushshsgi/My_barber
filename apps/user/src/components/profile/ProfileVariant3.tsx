import { Link } from "@tanstack/react-router";
import { Bell, ChevronRight, HelpCircle, LogOut, Settings, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { useProfileScreen } from "@/components/profile/useProfileScreen";

/** Ultra minimal profil — identity va asosiy linklar (Booking.com uslubi). */
export function ProfileVariant3() {
  const { t } = useTranslation();
  const { audience, handleLogout } = useProfileScreen();

  const rows = [
    { icon: Bell, label: t("notifications.title"), to: "/notifications", badge: "2" },
    { icon: Settings, label: t("profile.settings"), to: "/settings" },
    { icon: HelpCircle, label: t("profile.support"), to: "/support" },
    { icon: Shield, label: t("profile.privacy"), to: "/privacy" },
  ];

  return (
    <>
      <PageHeader title={t("profile.title")} />
      <ProfileIdentity audience={audience} />

      <p className="mx-5 mt-2 text-[11px] text-muted-foreground">{t("profile.variant3.hint")}</p>

      <div className="mt-6 px-5">
        <div className="overflow-hidden rounded-2xl border border-border">
          {rows.map((row, i) => {
            const Icon = row.icon;
            return (
              <Link
                key={row.to}
                to={row.to}
                className={
                  "flex items-center gap-3 px-4 py-4 active:bg-surface" +
                  (i < rows.length - 1 ? " border-b border-border" : "")
                }
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-surface">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-bold">{row.label}</span>
                {row.badge && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                    {row.badge}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>

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
