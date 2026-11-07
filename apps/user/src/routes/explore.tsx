import { createFileRoute } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ExploreDesktopPage } from "@/components/desktop/pages/ExploreDesktopPage";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Trend uslublar — mysaloon.uz" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  return <DesktopPageSplit mobile={<MysaloonPausedScreen />} desktop={<ExploreDesktopPage />} />;
}
