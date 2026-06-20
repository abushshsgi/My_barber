import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { ProfileAccountHubGrid } from "@/components/desktop/profile/ProfileAccountHubGrid";
import { SettingsFormSections } from "@/components/settings/SettingsFormSections";
import type { SettingsPageState } from "@/components/settings/useSettingsPage";

export function SettingsDesktopPage({ state }: { state: SettingsPageState }) {
  const { t, hubTiles } = state;

  return (
    <AccountDesktopShell bare wide>
      <header className="border-b border-border/70 pb-8">
        <Link
          to="/profile"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          {t("profile.desktop.pageTitle", { defaultValue: "Mening hisobim" })}
        </Link>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">
          {t("settings.pageTitle", { defaultValue: "Hisob sozlamalari" })}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("settings.pageLead", {
            defaultValue: "Shaxsiy ma'lumotlar, xavfsizlik, manzillar va ilova afzalliklari.",
          })}
        </p>
      </header>

      <section className="pt-8">
        <ProfileAccountHubGrid tiles={hubTiles} />
      </section>

      <section className="mt-12">
        <h2 className="mb-6 text-lg font-semibold text-foreground">
          {t("settings.manageDetails", { defaultValue: "Batafsil sozlamalar" })}
        </h2>
        <SettingsFormSections state={state} />
      </section>
    </AccountDesktopShell>
  );
}
