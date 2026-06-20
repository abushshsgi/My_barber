import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SettingsDesktopPage } from "@/components/desktop/pages/SettingsDesktopPage";
import { SettingsAirbnbSidebar } from "@/components/settings/SettingsAirbnbSidebar";
import { SettingsPanelContent } from "@/components/settings/SettingsPanelContent";
import { SettingsTopBar } from "@/components/settings/SettingsTopBar";
import { useSettingsPage } from "@/components/settings/useSettingsPage";
import { parseSettingsEdit, parseSettingsSection, type SettingsSection } from "@/lib/settings-nav";

const settingsSearchSchema = z.object({
  section: z.string().optional(),
  edit: z.string().optional(),
});

export const Route = createFileRoute("/settings")({
  validateSearch: settingsSearchSchema,
  head: () => ({ meta: [{ title: "Sozlamalar — mysaloon.uz" }] }),
  component: Settings,
});

function SettingsMobile({
  state,
  section,
  initialEdit,
}: {
  state: ReturnType<typeof useSettingsPage>;
  section: SettingsSection;
  initialEdit?: ReturnType<typeof parseSettingsEdit>;
}) {
  const { t } = state;

  return (
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <div className="border-b border-border px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <SettingsTopBar
          backLabel={t("common.back", { defaultValue: "Orqaga" })}
          doneLabel={t("settings.done", { defaultValue: "Tayyor" })}
        />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          {t("settings.pageTitle", { defaultValue: "Hisob sozlamalari" })}
        </h1>
      </div>

      <div className="px-3 py-4">
        <SettingsAirbnbSidebar active={section} t={t} compact />
      </div>

      <div className="border-t border-border px-5 py-6">
        <SettingsPanelContent
          section={section}
          state={state}
          initialEdit={initialEdit}
          showBack
        />
      </div>
    </div>
  );
}

function Settings() {
  const state = useSettingsPage();
  const search = Route.useSearch();
  const section = parseSettingsSection(search.section);
  const initialEdit = parseSettingsEdit(search.edit);

  return (
    <DesktopPageSplit
      mobile={<SettingsMobile state={state} section={section} initialEdit={initialEdit} />}
      desktop={<SettingsDesktopPage state={state} section={section} initialEdit={initialEdit} />}
    />
  );
}
