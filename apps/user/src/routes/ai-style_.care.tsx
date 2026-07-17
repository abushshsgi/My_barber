import { createFileRoute } from "@tanstack/react-router";
import { MorphAiCarePage } from "@/components/ai-style/MorphAiCarePage";

export const Route = createFileRoute("/ai-style_/care")({
  head: () => ({
    meta: [
      { title: "Morf AI Parvarish — mysaloon.uz" },
      {
        name: "description",
        content: "Shaxsiy soch parvarishi rejasi, mahsulotlar va salon maslahatlari.",
      },
    ],
  }),
  component: MorphAiCarePage,
});
