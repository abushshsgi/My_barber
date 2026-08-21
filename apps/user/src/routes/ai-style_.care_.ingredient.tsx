import { createFileRoute } from "@tanstack/react-router";
import { MorphAiIngredientScanPage } from "@/components/ai-style/MorphAiIngredientScanPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient")({
  head: () => ({
    meta: [
      { title: "Morf AI Tarkib skani — mysaloon.uz" },
      {
        name: "description",
        content:
          "Soch mahsuloti tarkibini AI bilan tahlil qiling — sochingizga mosligi, xavfli va foydali moddalar.",
      },
    ],
  }),
  component: MorphAiIngredientScanPage,
});
