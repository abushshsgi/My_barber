import { createFileRoute } from "@tanstack/react-router";
import { HairAdvisor2ProductPickPage } from "@/components/hair-advisor-2/HairAdvisor2ProductPickPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient_/pick/$scanId")({
  head: () => ({
    meta: [{ title: "Mahsulotni tanlang — MySaloon AI skaner" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { scanId } = Route.useParams();
  return (
    <HairAdvisor2ProductPickPage
      scanId={scanId}
      scanPath="/ai-style/care/ingredient"
      resultPath={(id) => `/ai-style/care/ingredient/result/${id}`}
    />
  );
}