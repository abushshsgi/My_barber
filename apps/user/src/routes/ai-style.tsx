import { createFileRoute, redirect } from "@tanstack/react-router";
import { AiStyleFlow } from "@/components/ai-style/AiStyleFlow";
import { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { resolveAiStyleAudience, useAudience } from "@/hooks/use-audience";

type AiStyleSearch = { styleId?: string };

export const Route = createFileRoute("/ai-style")({
  validateSearch: (search: Record<string, unknown>): AiStyleSearch => ({
    styleId: typeof search.styleId === "string" && search.styleId.trim()
      ? search.styleId.trim()
      : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.styleId) {
      throw redirect({
        to: "/explore/$styleId/try",
        params: { styleId: search.styleId },
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Morf AI — mysaloon.uz" },
      {
        name: "description",
        content: "Selfie yuklang — Morf AI yuz shakliga mos turmag tavsiya qiladi.",
      },
    ],
  }),
  component: AiStylePage,
});

function AiStylePage() {
  const { audience, profileDefault } = useAudience();
  const { personaId } = useExplorePersona();
  const styleAudience = resolveAiStyleAudience(profileDefault, audience);
  const flow = useAiStyleFlow({ menPersonaId: personaId, audience: styleAudience });

  return <AiStyleFlow flow={flow} audience={styleAudience} />;
}
