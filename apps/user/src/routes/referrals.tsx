import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsReferralPanel } from "@/components/settings/panels/SettingsReferralPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/referrals")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Do'stni taklif qilish — mysaloon.uz" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/profile");

  return (
    <ProfileSubpageLayout
      title={t("referral.title", { defaultValue: "Do'stni taklif qilish" })}
      subtitle={t("referral.subtitle", { defaultValue: "Do'st va oilangizni MySaloon'ga taklif qiling." })}
      backTo={backTo}
    >
      <SettingsReferralPanel />
    </ProfileSubpageLayout>
  );
}
