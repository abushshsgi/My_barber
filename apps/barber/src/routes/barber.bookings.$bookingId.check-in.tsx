import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";

type CheckInSearch = {
  finish?: boolean;
};

export const Route = createFileRoute("/barber/bookings/$bookingId/check-in")({
  validateSearch: (raw: Record<string, unknown>): CheckInSearch => ({
    finish: raw.finish === "1" || raw.finish === 1 || raw.finish === true,
  }),
  component: BarberBookingCheckInRedirect,
});

/** Eski /check-in URL — bitta bron sahifasiga yo'naltiradi. */
function BarberBookingCheckInRedirect() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { finish } = Route.useSearch();

  useEffect(() => {
    void navigate({
      to: "/barber/bookings/$bookingId",
      params: { bookingId },
      search: finish ? { finish: true } : {},
      replace: true,
    });
  }, [bookingId, finish, navigate]);

  const shell = (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-5 animate-spin" />
      Yo&apos;naltirilmoqda…
    </div>
  );

  return <DesktopPageSplit mobile={shell} desktop={shell} />;
}
