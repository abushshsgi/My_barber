import { createFileRoute, redirect } from "@tanstack/react-router";
import { MORPH_STUDIO_ENABLED } from "@/lib/morph-studio";
import { MorphAiStudioPage } from "@/components/ai-style/MorphAiStudioPage";

export const Route = createFileRoute("/ai-style_/studio")({
  beforeLoad: () => {
    if (!MORPH_STUDIO_ENABLED) {
      throw redirect({ to: "/ai-style", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Morf AI Studio — mysaloon.uz" },
      {
        name: "description",
        content: "Soch rangi, soqol va finish — Morf AI Studio tahriri.",
      },
    ],
  }),
  component: MorphAiStudioPage,
});
