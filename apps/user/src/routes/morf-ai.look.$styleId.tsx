import { createFileRoute } from "@tanstack/react-router";
import { MorphLookShareLanding } from "@/components/ai-style/MorphLookShareLanding";

export const Route = createFileRoute("/morf-ai/look/$styleId")({
  head: ({ params }) => ({
    meta: [
      { title: "Morf AI uslub — mysaloon.uz" },
      {
        name: "description",
        content: "Do‘stingiz sinab ko‘rgan uslubni Morf AI da o‘zingizda sinang.",
      },
      { property: "og:title", content: "Morf AI — bu uslub sizga ham yarashishi mumkin" },
      {
        property: "og:description",
        content: "Selfie yuklang va shu soch turmakini yuzingizda ko‘ring.",
      },
    ],
  }),
  component: MorphLookSharePage,
});

function MorphLookSharePage() {
  const { styleId } = Route.useParams();
  return <MorphLookShareLanding styleId={styleId} />;
}
