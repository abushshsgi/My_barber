import { createFileRoute } from "@tanstack/react-router";
import { MorphAiConsultPage } from "@/components/barber-consult/MorphAiConsultPage";

type ConsultSearch = {
  preview?: "barber";
  styleId?: string;
  styleName?: string;
};

export const Route = createFileRoute("/ai-style_/consult")({
  validateSearch: (search: Record<string, unknown>): ConsultSearch => ({
    preview: search.preview === "barber" ? "barber" : undefined,
    styleId:
      typeof search.styleId === "string" && search.styleId.trim()
        ? search.styleId.trim()
        : undefined,
    styleName:
      typeof search.styleName === "string" && search.styleName.trim()
        ? search.styleName.trim()
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Barber Consult — mysaloon.uz" },
      {
        name: "description",
        content: "Morf AI Barber Master Card, multi-angle preview va bron.",
      },
    ],
  }),
  component: MorphAiConsultPage,
});
