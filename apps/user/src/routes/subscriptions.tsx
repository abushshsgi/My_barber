import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsSubscriptionsPanel } from "@/components/settings/panels/SettingsSubscriptionsPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/subscriptions")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Obunalar — mysaloon.uz" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=subscriptions");

  return (
    <ProfileSubpageLayout title={t("subscriptions.title")} backTo={backTo}>
      <SettingsSubscriptionsPanel />
    </ProfileSubpageLayout>
  );
}
