import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/barber/bookings/$bookingId")({
  component: BookingDetailLayout,
});

function BookingDetailLayout() {
  return <Outlet />;
}
