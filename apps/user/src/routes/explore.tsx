import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreDesktopPage } from "@/components/desktop/pages/ExploreDesktopPage";
import { ExploreMobilePage } from "@/components/explore/ExploreMobilePage";
import { trackEvent } from "@/lib/analytics";
import { EXPLORE_LCP_HERO_SRC } from "@/lib/explore-lcp-static";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [{ title: "Trend uslublar — mysaloon.uz" }],
    links: [
      {
        rel: "preload",
        href: EXPLORE_LCP_HERO_SRC,
        as: "image",
        type: "image/webp",
        fetchPriority: "high",
      },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  useEffect(() => {
    trackEvent("catalog_opened", {}, { dedupeKey: "explore" });
  }, []);
  return (
    <DesktopPageSplit
      mobile={<ExploreMobilePage />}
      desktop={<ExploreDesktopPage />}
    />
  );
}