import { createFileRoute } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { TopSalonsDesktopPage } from "@/components/desktop/pages/TopSalonsDesktopPage";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";
import { useTopSalons } from "@/hooks/use-top-salons";

export const Route = createFileRoute("/top")({
  head: () => ({
    meta: [
      { title: "Top salonlar — mysaloon.uz" },
      { name: "description", content: "Reytingi 4.8 va undan yuqori bo'lgan eng yaxshi salonlar." },
    ],
  }),
  component: TopSalonsRoute,
});

function TopSalonsRoute() {
  const { salons, loading } = useTopSalons();

  return (
    <DesktopPageSplit
      mobile={<MysaloonPausedScreen />}
      desktop={<TopSalonsDesktopPage salons={salons} loading={loading} />}
    />
  );
}
