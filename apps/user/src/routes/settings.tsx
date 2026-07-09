import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { SettingsDesktopPage } from "@/components/desktop/pages/SettingsDesktopPage";
import { SettingsAirbnbSidebar } from "@/components/settings/SettingsAirbnbSidebar";
import { SettingsPanelContent } from "@/components/settings/SettingsPanelContent";
import { useSettingsPage } from "@/components/settings/useSettingsPage";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import {
  parseSettingsEdit,
  parseSettingsSection,
  parseSettingsSectionOptional,
  SETTINGS_SECTION_TITLE_KEYS,
  type SettingsSection,
} from "@/lib/settings-nav";

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

type PanelProps = {
  state: ReturnType<typeof useSettingsPage>;
  section: SettingsSection;
  initialEdit?: ReturnType<typeof parseSettingsEdit>;
  addressEditId?: number;
  addressAdd?: boolean;
  manage?: boolean;
  onAddressEditorClose: () => void;
};

function settingsSectionBackTo(
  section: SettingsSection,
  opts: { manage?: boolean; addressEditId?: number; addressAdd?: boolean },
): string {
  if (opts.manage || opts.addressEditId != null || opts.addressAdd) {
    return `/settings?section=${section}`;
  }
  return "/settings";
}

function SettingsMobileIndex({ state }: { state: ReturnType<typeof useSettingsPage> }) {
  const { t } = state;

  return (
    <ProfileSubpageLayout
      title={t("settings.pageTitle", { defaultValue: "Hisob sozlamalari" })}
      backTo="/profile"
      flush
    >
      <SettingsAirbnbSidebar mobileList t={t} />
    </ProfileSubpageLayout>
  );
}

function SettingsMobileSection({
  state,
  section,
  initialEdit,
  addressEditId,
  addressAdd,
  manage,
  onAddressEditorClose,
}: PanelProps) {
  const { t } = state;
  const titleMeta = SETTINGS_SECTION_TITLE_KEYS[section];

  return (
    <ProfileSubpageLayout
      title={t(titleMeta.titleKey, { defaultValue: titleMeta.defaultTitle })}
      backTo={settingsSectionBackTo(section, { manage, addressEditId, addressAdd })}
      strictBack
      flush
    >
      <div className="px-4 pb-8 pt-2">
        <SettingsPanelContent
          section={section}
          state={state}
          initialEdit={initialEdit}
          addressEditId={addressEditId}
          addressAdd={addressAdd}
          manage={manage}
          onAddressEditorClose={onAddressEditorClose}
          hideTitle
        />
      </div>
    </ProfileSubpageLayout>
  );
}

function SettingsMobile(props: PanelProps & { showIndex: boolean }) {
  if (props.showIndex) {
    return <SettingsMobileIndex state={props.state} />;
  }
  return <SettingsMobileSection {...props} />;
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

  const hasMobileDetail =
    parseSettingsSectionOptional(search.section) != null ||
    initialEdit != null ||
    manage === true ||
    addressEditId != null ||
    addressAdd === true;

  const onAddressEditorClose = () => {
    void navigate({
      to: "/settings",
      search: { section: "addresses", manage: true },
      replace: true,
    });
  };

  const panelProps: PanelProps = {
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
      mobile={<SettingsMobile {...panelProps} showIndex={!hasMobileDetail} />}
      desktop={<SettingsDesktopPage {...panelProps} />}
    />
  );
}
