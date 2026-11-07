import { createFileRoute } from "@tanstack/react-router";
import { BookingProcessDesktopPage } from "@/components/desktop/pages/BookingProcessDesktopPage";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";
import { useBookingProcessPage } from "@/hooks/use-booking-process-page";

export const Route = createFileRoute("/bookings/$bookingId")({
  validateSearch: (search: Record<string, unknown>): { survey?: number } => ({
    survey: search.survey === 1 || search.survey === "1" ? 1 : undefined,
  }),
  head: ({ params }) => ({
    meta: [{ title: `Bron #${params.bookingId} — mysaloon.uz` }],
  }),
  component: BookingProcessRoute,
});

function BookingProcessRoute() {
  const { bookingId } = Route.useParams();
  const { survey } = Route.useSearch();
  const state = useBookingProcessPage(bookingId, { forceSurveyOpen: survey === 1 });

  return (
    <DesktopPageSplit
      mobile={<MysaloonPausedScreen />}
      desktop={<BookingProcessDesktopPage state={state} />}
    />
  );
}
