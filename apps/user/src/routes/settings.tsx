import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SettingsDesktopPage } from "@/components/desktop/pages/SettingsDesktopPage";
import { ProfileAccountHubGrid } from "@/components/desktop/profile/ProfileAccountHubGrid";
import { SettingsFormSections } from "@/components/settings/SettingsFormSections";
import { useSettingsPage } from "@/components/settings/useSettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Sozlamalar — mysaloon.uz" }] }),
  component: Settings,
});

function SettingsMobile({ state }: { state: ReturnType<typeof useSettingsPage> }) {
  const { t, hubTiles } = state;

  return (
    <div className="min-h-full bg-surface pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <div className="px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-start gap-3">
          <Link
            to="/profile"
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background"
            aria-label={t("common.back", { defaultValue: "Orqaga" })}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              {t("settings.pageTitle", { defaultValue: "Hisob sozlamalari" })}
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {t("settings.pageLead", {
                defaultValue: "Shaxsiy ma'lumotlar, xavfsizlik, manzillar va ilova afzalliklari.",
              })}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-t-[28px] bg-background px-5 pb-6 pt-5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.08)]">
        <ProfileAccountHubGrid tiles={hubTiles} />
        <div className="mt-8">
          <SettingsFormSections state={state} />
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const state = useSettingsPage();

  return (
    <DesktopPageSplit
      mobile={<SettingsMobile state={state} />}
      desktop={<SettingsDesktopPage state={state} />}
    />
  );
}
