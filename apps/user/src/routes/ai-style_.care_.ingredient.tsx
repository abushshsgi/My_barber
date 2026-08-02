import { createFileRoute } from "@tanstack/react-router";
import { MorphAiIngredientScanPage } from "@/components/ai-style/MorphAiIngredientScanPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient")({
  head: () => ({
    meta: [
      { title: "Morf AI Tarkib skani — mysaloon.uz" },
      {
        name: "description",
        content:
          "Kosmetika tarkibini (INCI) AI bilan tahlil qiling — komedogen moddalar va teri mosligi.",
      },
    ],
  }),
  component: MorphAiIngredientScanPage,
});
