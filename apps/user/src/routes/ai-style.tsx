import { createFileRoute } from "@tanstack/react-router";
import { AiStyleFlow } from "@/components/ai-style/AiStyleFlow";
import { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import { useAudience } from "@/hooks/use-audience";

export const Route = createFileRoute("/ai-style")({
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
  const { audience } = useAudience();
  const flow = useAiStyleFlow();

  return <AiStyleFlow flow={flow} audience={audience} />;
}
