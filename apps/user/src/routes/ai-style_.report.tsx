import { createFileRoute } from "@tanstack/react-router";
import { MorphAiSupportPage } from "@/components/ai-style/MorphAiSupportPage";

export const Route = createFileRoute("/ai-style_/report")({
  head: () => ({
    meta: [
      { title: "Morf AI muammo — mysaloon.uz" },
      {
        name: "description",
        content: "Morf AI muammo haqida xabar bering — Morph AI support ko'radi va hal qiladi.",
      },
    ],
  }),
  component: MorphReportPage,
});

function MorphReportPage() {
  return <MorphAiSupportPage mode="report" />;
}
