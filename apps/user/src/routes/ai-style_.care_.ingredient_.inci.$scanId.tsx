import { createFileRoute } from "@tanstack/react-router";
import { HairAdvisor2IngredientsPage } from "@/components/hair-advisor-2/HairAdvisor2IngredientsPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient_/inci/$scanId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { scanId } = Route.useParams();
  return (
    <HairAdvisor2IngredientsPage
      scanId={scanId}
      resultPath={(id) => `/ai-style/care/ingredient/result/${id}`}
      detailPath={(id, inci) => `/ai-style/care/ingredient/inci/${id}/${inci}`}
    />
  );
}