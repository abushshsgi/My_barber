import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AiStyleVariantCamera } from "@/components/ai-style/AiStyleVariantCamera";
import { AiStyleVariantPicker } from "@/components/ai-style/AiStyleVariantPicker";
import { AiStyleVariantStudio } from "@/components/ai-style/AiStyleVariantStudio";
import { AiStyleVariantWizard } from "@/components/ai-style/AiStyleVariantWizard";
import {
  aiStyleVariantMeta,
  readAiStyleVariant,
  saveAiStyleVariant,
  type AiStylePageVariant,
} from "@/components/ai-style/ai-style-variants";
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
  const [variant, setVariant] = useState<AiStylePageVariant>(() => readAiStyleVariant());
  const flow = useAiStyleFlow();

  const onVariantChange = (next: AiStylePageVariant) => {
    setVariant(next);
    saveAiStyleVariant(next);
    flow.reset();
  };

  return (
    <ProfileSubpageLayout
      title={t("aiStylePage.title")}
      subtitle={t(aiStyleVariantMeta[variant].hintKey)}
    >
      <AiStyleVariantPicker value={variant} onChange={onVariantChange} />

      <ProfileSubpageCard className="mb-4">
        <AudienceSwitch />
      </ProfileSubpageCard>

      {variant === "v01" ? (
        <AiStyleVariantWizard flow={flow} audience={audience} />
      ) : variant === "v02" ? (
        <AiStyleVariantStudio flow={flow} audience={audience} />
      ) : (
        <AiStyleVariantCamera flow={flow} audience={audience} />
      )}
    </ProfileSubpageLayout>
  );
}
