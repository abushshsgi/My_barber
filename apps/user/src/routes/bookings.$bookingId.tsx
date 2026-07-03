import { createFileRoute } from "@tanstack/react-router";
import {
  BookingProcessDesktopPage,
  BookingProcessMobilePage,
} from "@/components/desktop/pages/BookingProcessDesktopPage";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { useBookingProcessPage } from "@/hooks/use-booking-process-page";

export const Route = createFileRoute("/bookings/$bookingId")({
  head: ({ params }) => ({
    meta: [{ title: `Bron #${params.bookingId} — mysaloon.uz` }],
  }),
  component: BookingProcessRoute,
});

function BookingProcessRoute() {
  const { bookingId } = Route.useParams();
  const state = useBookingProcessPage(bookingId);

  return (
    <DesktopPageSplit
      mobile={<BookingProcessMobilePage state={state} />}
      desktop={<BookingProcessDesktopPage state={state} />}
    />
  );
}
