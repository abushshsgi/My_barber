import { createFileRoute } from "@tanstack/react-router";
import { MorphAiChatPage } from "@/components/ai-style/MorphAiChatPage";

export const Route = createFileRoute("/ai-style_/chat")({
  head: () => ({
    meta: [
      { title: "Morf AI Chatbot — mysaloon.uz" },
      {
        name: "description",
        content: "Morf AI chatbot — soch, parvarish va uslub bo‘yicha yordamchi.",
      },
    ],
  }),
  component: MorphAiChatPage,
});
