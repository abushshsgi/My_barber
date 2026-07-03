import { createFileRoute } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { BarberMobilePage } from "@/components/barber/BarberMobilePage";
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
      mobile={<BarberMobilePage barberId={barberId} />}
      desktop={
        <div className="mx-auto max-w-2xl py-8">
          <BarberProfileContent barberId={barberId} />
        </div>
      }
    />
  );
}
