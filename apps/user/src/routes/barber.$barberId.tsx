import { createFileRoute } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";
import { BarberProfileContent } from "@/components/barber/BarberProfileContent";

export const Route = createFileRoute("/barber/$barberId")({
  head: () => ({
    meta: [{ title: "Usta — mysaloon.uz" }],
  }),
  component: BarberProfilePage,
});

function BarberProfilePage() {
  const { barberId } = Route.useParams();
  return (
    <DesktopPageSplit
      mobile={<MysaloonPausedScreen />}
      desktop={
        <div className="mx-auto max-w-2xl py-8">
          <BarberProfileContent barberId={barberId} />
        </div>
      }
    />
  );
}
