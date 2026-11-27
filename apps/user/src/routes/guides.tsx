import { createFileRoute } from "@tanstack/react-router";
import { GuidesDiscovery } from "@/components/guides/GuidesDiscovery";
import { guideIndexHead } from "@/lib/guide-seo.server";

export const Route = createFileRoute("/guides")({
  head: () => guideIndexHead("uz"),
  component: function GuidesIndexPage() {
    return <GuidesDiscovery locale="uz" />;
  },
});
