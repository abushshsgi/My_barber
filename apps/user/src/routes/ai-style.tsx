import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AiStyleFlow } from "@/components/ai-style/AiStyleFlow";
import { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { useAudience } from "@/hooks/use-audience";

export const Route = createFileRoute("/ai-style")({
  head: () => ({
    meta: [
      { title: "AI Stil maslahatchi — mysaloon.uz" },
      { name: "description", content: "Selfie yuklang — AI yuz shakliga mos turmag tavsiya qiladi." },
    ],
  }),
  component: AiStylePage,
});

function AiStylePage() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const flow = useAiStyleFlow();

  return (
    <ProfileSubpageLayout title={t("aiStylePage.title")} subtitle={t("aiStylePage.subtitle")}>
      <ProfileSubpageCard className="mb-4">
        <AudienceSwitch />
      </ProfileSubpageCard>
      <AiStyleFlow flow={flow} audience={audience} />
    </ProfileSubpageLayout>
  );
}
