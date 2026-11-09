import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { SettingsReferralPanel } from "@/components/settings/panels/SettingsReferralPanel";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/referrals")({
  validateSearch: (search: Record<string, unknown>): { backTo?: string } => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Do'stlarni taklif — mysaloon.uz" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/profile");

  return (
    <ProfileSubpageLayout
      title={t("referral.title", { defaultValue: "Do'stlarni taklif" })}
      subtitle={t("referral.subtitle", {
        defaultValue: "1 do'st = 1 ta bepul try-on.",
      })}
      backTo={backTo}
    >
      <SettingsReferralPanel />
    </ProfileSubpageLayout>
  );
}
