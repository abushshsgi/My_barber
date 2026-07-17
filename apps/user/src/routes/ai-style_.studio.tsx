import { createFileRoute } from "@tanstack/react-router";
import { MorphAiStudioPage } from "@/components/ai-style/MorphAiStudioPage";

export const Route = createFileRoute("/ai-style_/studio")({
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
