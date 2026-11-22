import { createFileRoute } from "@tanstack/react-router";
import { HairAdvisor2ResultPage } from "@/components/hair-advisor-2/HairAdvisor2ResultPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient_/result/$scanId")({
  head: ({ params }) => ({
    meta: [
      {
        title:
          params.scanId === "demo" || params.scanId === "preview"
            ? "Tahlil natijasi (demo) — MySaloon"
            : "Tahlil natijasi — MySaloon Hair Advisor",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { scanId } = Route.useParams();
  return (
    <HairAdvisor2ResultPage
      scanId={scanId}
      scanPath="/ai-style/care/ingredient"
      inciListPath={(id) => `/ai-style/care/ingredient/inci/${id}`}
    />
  );
}