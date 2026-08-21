import { createFileRoute } from "@tanstack/react-router";
import { MorphAiCareProductDetailPage } from "@/components/ai-style/MorphAiCareProductDetailPage";

export const Route = createFileRoute("/ai-style_/care_/products_/$productId")({
  head: () => ({
    meta: [{ title: "Mahsulot — mysaloon.uz" }],
  }),
  component: CareProductDetailRoute,
});

function CareProductDetailRoute() {
  const { productId } = Route.useParams();
  return <MorphAiCareProductDetailPage productId={productId} />;
}
