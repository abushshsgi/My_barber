import { createFileRoute } from "@tanstack/react-router";
import { HairAdvisor2IngredientDetailPage } from "@/components/hair-advisor-2/HairAdvisor2IngredientDetailPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient_/inci/$scanId_/$inciSlug")({
  component: RouteComponent,
});

function RouteComponent() {
  const { scanId, inciSlug } = Route.useParams();
  return (
    <HairAdvisor2IngredientDetailPage
      scanId={scanId}
      inciEncoded={inciSlug}
      listPath={(id) => `/ai-style/care/ingredient/inci/${id}`}
    />
  );
}