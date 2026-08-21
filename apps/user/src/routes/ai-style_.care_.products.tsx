import { createFileRoute } from "@tanstack/react-router";
import { MorphAiCareProductsPage } from "@/components/ai-style/MorphAiCareProductsPage";

export const Route = createFileRoute("/ai-style_/care_/products")({
  head: () => ({
    meta: [
      { title: "Soch vositalari — mysaloon.uz" },
      {
        name: "description",
        content: "Shampun, balzam va boshqa soch vositalarining tarkibi va qo‘llanishi.",
      },
    ],
  }),
  component: MorphAiCareProductsPage,
});
