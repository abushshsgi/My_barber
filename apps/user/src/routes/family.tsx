import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsFamilyPanel } from "@/components/settings/panels/SettingsFamilyPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/family")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Oilaviy profil — mysaloon.uz" }] }),
  component: FamilyPage,
});

function FamilyPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=family");

  return (
    <ProfileSubpageLayout
      title={t("family.title")}
      subtitle={t("family.subtitle")}
      backTo={backTo}
    >
      <SettingsFamilyPanel />
    </ProfileSubpageLayout>
  );
}
