import { createFileRoute } from "@tanstack/react-router";
import { HairAdvisor2RecoverPage } from "@/components/hair-advisor-2/HairAdvisor2RecoverPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient_/recover/$scanId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { scanId } = Route.useParams();
  return (
    <HairAdvisor2RecoverPage
      scanId={scanId}
      scanPath="/ai-style/care/ingredient"
      resultPath={(id) => `/ai-style/care/ingredient/result/${id}`}
    />
  );
}