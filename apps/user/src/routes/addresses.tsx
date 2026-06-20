import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsAddressesPanel } from "@/components/settings/panels/SettingsAddressesPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/addresses")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
    edit:
      typeof search.edit === "number"
        ? search.edit
        : typeof search.edit === "string" && /^\d+$/.test(search.edit)
          ? Number(search.edit)
          : undefined,
    add: search.add === true || search.add === "1" || search.add === 1,
  }),
  head: () => ({ meta: [{ title: "Manzillarim — mysaloon.uz" }] }),
  component: AddressesPage,
});

function AddressesPage() {
  const { t } = useTranslation();
  const navigate = Route.useNavigate();
  const { backTo: backToParam, edit: editParam, add: addParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam });

  const onEditorClose = () => {
    if (editParam != null || addParam) {
      void navigate({
        to: "/addresses",
        search: { backTo: backToParam },
        replace: true,
      });
    }
  };

  return (
    <ProfileSubpageLayout title={t("addresses.title")} subtitle={t("addresses.hint")} backTo={backTo}>
      <SettingsAddressesPanel
        initialEditId={editParam}
        initialAdd={addParam}
        onEditorClose={onEditorClose}
      />
    </ProfileSubpageLayout>
  );
}
