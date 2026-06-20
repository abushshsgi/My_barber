import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SettingsDesktopPage } from "@/components/desktop/pages/SettingsDesktopPage";
import { SettingsAirbnbSidebar } from "@/components/settings/SettingsAirbnbSidebar";
import { SettingsPanelContent } from "@/components/settings/SettingsPanelContent";
import { useSettingsPage } from "@/components/settings/useSettingsPage";
import { parseSettingsSection, type SettingsSection } from "@/lib/settings-nav";

const settingsSearchSchema = z.object({
  section: z.string().optional(),
});

export const Route = createFileRoute("/settings")({
  validateSearch: settingsSearchSchema,
  head: () => ({ meta: [{ title: "Sozlamalar — mysaloon.uz" }] }),
  component: Settings,
});

function SettingsMobile({
  state,
  section,
}: {
  state: ReturnType<typeof useSettingsPage>;
  section: SettingsSection;
}) {
  const { t } = state;

  return (
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <div className="border-b border-border px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/profile"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background"
            aria-label={t("common.back", { defaultValue: "Orqaga" })}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <Link
            to="/profile"
            className="text-sm font-semibold text-foreground underline underline-offset-2"
          >
            {t("settings.done", { defaultValue: "Tayyor" })}
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {t("settings.pageTitle", { defaultValue: "Hisob sozlamalari" })}
        </h1>
      </div>

      <div className="px-3 py-4">
        <SettingsAirbnbSidebar
          active={section}
          t={t}
          compact
        />
      </div>

      <div className="border-t border-border px-5 py-6">
        <SettingsPanelContent section={section} state={state} />
      </div>
    </div>
  );
}

function Settings() {
  const state = useSettingsPage();
  const { section: sectionParam } = Route.useSearch();
  const section = parseSettingsSection(sectionParam);

  return (
    <DesktopPageSplit
      mobile={<SettingsMobile state={state} section={section} />}
      desktop={<SettingsDesktopPage state={state} section={section} />}
    />
  );
}
