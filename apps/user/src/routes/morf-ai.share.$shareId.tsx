import { createFileRoute } from "@tanstack/react-router";
import { MorphPersonalShareLanding } from "@/components/ai-style/MorphPersonalShareLanding";

export const Route = createFileRoute("/morf-ai/share/$shareId")({
  head: () => ({
    meta: [
      { title: "Morf AI before/after — mysaloon.uz" },
      {
        name: "description",
        content: "Do‘stingizning Morf AI before/after natijasini ko‘ring va o‘zingizda sinang.",
      },
      { property: "og:title", content: "Morf AI — do‘stingizning before / after" },
      {
        property: "og:description",
        content: "Haqiqiy natija. Selfie bilan o‘zingizda ham sinab ko‘ring.",
      },
    ],
  }),
  component: MorphPersonalSharePage,
});

function MorphPersonalSharePage() {
  const { shareId } = Route.useParams();
  return <MorphPersonalShareLanding shareId={shareId} />;
}
