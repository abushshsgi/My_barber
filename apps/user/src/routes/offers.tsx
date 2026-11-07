import { createFileRoute } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { OffersDesktopPage } from "@/components/desktop/pages/OffersDesktopPage";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";

export const Route = createFileRoute("/offers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aksiyalar — mysaloon.uz" },
      {
        name: "description",
        content: "Salonlar va xizmatlar bo'yicha maxsus takliflar va promokodlar.",
      },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return <DesktopPageSplit mobile={<MysaloonPausedScreen />} desktop={<OffersDesktopPage />} />;
}
