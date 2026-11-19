import { createFileRoute } from "@tanstack/react-router";
import { HairAdvisor2ScanPage } from "@/components/hair-advisor-2/HairAdvisor2ScanPage";

export const Route = createFileRoute("/ai-style_/care_/ingredient")({
  head: () => ({
    meta: [
      { title: "Skanerlash — MySaloon Hair Advisor" },
      {
        name: "description",
        content: "Shtrix-kod orqali soch parvarish mahsulotini skanerlang va shaxsiy tahlil oling.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <HairAdvisor2ScanPage
      scanPath="/ai-style/care/ingredient"
      resultPath={(id) => `/ai-style/care/ingredient/result/${id}`}
    />
  );
}