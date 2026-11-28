import { createFileRoute } from "@tanstack/react-router";
import { ExploreRoutePage } from "@/components/explore/ExploreRoutePage";
import { buildRegistryHead } from "@/seo/build-head";
import { EXPLORE_LCP_HERO_SRC } from "@/lib/explore-lcp-static";

export const Route = createFileRoute("/explore")({
  head: () => {
    const head = buildRegistryHead("explore", "uz");
    return {
      ...head,
      links: [
        ...(head.links ?? []),
        {
          rel: "preload",
          href: EXPLORE_LCP_HERO_SRC,
          as: "image",
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
    };
  },
  component: function ExplorePage() {
    return <ExploreRoutePage locale="uz" />;
  },
});