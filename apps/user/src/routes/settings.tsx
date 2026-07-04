import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SettingsDesktopPage } from "@/components/desktop/pages/SettingsDesktopPage";
import { SettingsAirbnbSidebar } from "@/components/settings/SettingsAirbnbSidebar";
import { SettingsPanelContent } from "@/components/settings/SettingsPanelContent";
import { SettingsTopBar } from "@/components/settings/SettingsTopBar";
import { useSettingsPage } from "@/components/settings/useSettingsPage";
import { parseSettingsEdit, parseSettingsSection, type SettingsSection } from "@/lib/settings-nav";
import { getMobileContentPaddingClass } from "@/lib/layout-constants";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const settingsSearchSchema = z.object({
  section: z.string().optional(),
  edit: z.string().optional(),
  manage: z
    .union([z.boolean(), z.literal("1"), z.literal(1)])
    .optional()
    .transform((v) => v === true || v === "1" || v === 1),
  addressEdit: z.coerce.number().optional(),
  addressAdd: z
    .union([z.boolean(), z.literal("1"), z.literal(1)])
    .optional()
    .transform((v) => v === true || v === "1" || v === 1),
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
  addressEditId,
  addressAdd,
  manage,
  onAddressEditorClose,
}: {
  state: ReturnType<typeof useSettingsPage>;
  section: SettingsSection;
  initialEdit?: ReturnType<typeof parseSettingsEdit>;
  addressEditId?: number;
  addressAdd?: boolean;
  manage?: boolean;
  onAddressEditorClose: () => void;
}) {
  const { t } = state;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={cn("min-h-full bg-background", getMobileContentPaddingClass(pathname))}>
      <div className="border-b-2 border-border px-4 pb-4 pt-safe">
        <SettingsTopBar
          backLabel={t("common.back", { defaultValue: "Orqaga" })}
          doneLabel={t("settings.done", { defaultValue: "Tayyor" })}
        />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
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
          addressEditId={addressEditId}
          addressAdd={addressAdd}
          manage={manage}
          onAddressEditorClose={onAddressEditorClose}
          showBack
        />
      </div>
    </div>
  );
}

function Settings() {
  const state = useSettingsPage();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const section = parseSettingsSection(search.section);
  const initialEdit = parseSettingsEdit(search.edit);
  const addressEditId = search.addressEdit;
  const addressAdd = search.addressAdd;
  const manage = search.manage;

  const onAddressEditorClose = () => {
    void navigate({
      to: "/settings",
      search: { section: "addresses", manage: true },
      replace: true,
    });
  };

  const panelProps = {
    state,
    section,
    initialEdit,
    addressEditId,
    addressAdd,
    manage,
    onAddressEditorClose,
  };

  return (
    <DesktopPageSplit
      mobile={<SettingsMobile {...panelProps} />}
      desktop={<SettingsDesktopPage {...panelProps} />}
    />
  );
}
