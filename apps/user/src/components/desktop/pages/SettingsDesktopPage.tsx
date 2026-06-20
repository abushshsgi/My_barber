import { DESKTOP_ACCOUNT_BG } from "@/components/desktop/ui/desktop-glass";
import { SettingsAirbnbSidebar } from "@/components/settings/SettingsAirbnbSidebar";
import { SettingsPanelContent } from "@/components/settings/SettingsPanelContent";
import { SettingsTopBar } from "@/components/settings/SettingsTopBar";
import type { SettingsPageState } from "@/components/settings/useSettingsPage";
import type { SettingsEditField, SettingsSection } from "@/lib/settings-nav";
import { cn } from "@/lib/utils";

type Props = {
  state: SettingsPageState;
  section: SettingsSection;
  initialEdit?: SettingsEditField;
  addressEditId?: number;
  addressAdd?: boolean;
  manage?: boolean;
  onAddressEditorClose: () => void;
};

export function SettingsDesktopPage({
  state,
  section,
  initialEdit,
  addressEditId,
  addressAdd,
  manage,
  onAddressEditorClose,
}: Props) {
  const { t } = state;

  return (
    <div className={cn("w-full", DESKTOP_ACCOUNT_BG)}>
      <div className="lg:pl-8 xl:pl-14">
        <SettingsTopBar
          className="mb-6 border-b border-border/70 pb-4"
          backLabel={t("common.back", { defaultValue: "Orqaga" })}
          doneLabel={t("settings.done", { defaultValue: "Tayyor" })}
        />

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-10 xl:gap-14 lg:pb-12">
          <aside className="lg:w-[380px] xl:w-[420px] lg:shrink-0">
            <h1 className="text-[32px] font-semibold tracking-tight text-foreground xl:text-[36px]">
              {t("settings.pageTitle", { defaultValue: "Hisob sozlamalari" })}
            </h1>
            <div className="mt-7">
              <SettingsAirbnbSidebar active={section} t={t} large />
            </div>
          </aside>

          <main className="min-w-0 flex-1 lg:max-w-[680px] xl:max-w-[720px] lg:pt-1">
            <SettingsPanelContent
              section={section}
              state={state}
              initialEdit={initialEdit}
              addressEditId={addressEditId}
              addressAdd={addressAdd}
              manage={manage}
              onAddressEditorClose={onAddressEditorClose}
              showBack
            />
          </main>
        </div>
      </div>
    </div>
  );
}
