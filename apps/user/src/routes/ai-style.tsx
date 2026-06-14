import { createFileRoute } from "@tanstack/react-router";
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
  head: () => ({
    meta: [
      { title: "AI Stil maslahatchi — mysaloon.uz" },
      {
        name: "description",
        content: "Selfie yuklang — AI yuz shakliga mos turmag tavsiya qiladi.",
      },
    ],
  }),
  component: AiStylePage,
});

function AiStylePage() {
  const { audience, profileDefault } = useAudience();
  const { styleId } = Route.useSearch();
  const { personaId } = useExplorePersona();
  const styleAudience = resolveAiStyleAudience(profileDefault, audience);
  const flow = useAiStyleFlow({
    menPersonaId: personaId,
    focusStyleId: styleId,
    audience: styleAudience,
  });

  return <AiStyleFlow flow={flow} audience={styleAudience} focusStyleId={styleId} />;
}
