import { createFileRoute } from "@tanstack/react-router";
import { MorphAiSupportPage } from "@/components/ai-style/MorphAiSupportPage";

export const Route = createFileRoute("/ai-style_/help")({
  head: () => ({
    meta: [
      { title: "Morf AI yordam — mysaloon.uz" },
      {
        name: "description",
        content: "Morf AI yordam markazi — savol yozing, support javob beradi.",
      },
    ],
  }),
  component: MorphHelpPage,
});

function MorphHelpPage() {
  return <MorphAiSupportPage mode="help" />;
}
