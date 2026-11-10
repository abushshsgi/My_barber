import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreDesktopPage } from "@/components/desktop/pages/ExploreDesktopPage";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Trend uslublar — mysaloon.uz" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  useEffect(() => {
    trackEvent("catalog_opened", {}, { dedupeKey: "explore" });
  }, []);
  return <DesktopPageSplit mobile={<MysaloonPausedScreen />} desktop={<ExploreDesktopPage />} />;
}
