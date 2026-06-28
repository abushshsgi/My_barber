import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { BookingsDesktopPage } from "@/components/desktop/pages/BookingsDesktopPage";
import { BookingsMobile } from "@/components/bookings/BookingsMobile";

export const Route = createFileRoute("/bookings")({
  validateSearch: (search: Record<string, unknown>) => ({
    focus: typeof search.focus === "string" ? search.focus : undefined,
  }),
  head: () => ({ meta: [{ title: "Buyurtmalarim — mysaloon.uz" }] }),
  component: BookingsRoute,
});

function BookingsRoute() {
  const detail = useMatch({
    from: "/bookings/$bookingId",
    shouldThrow: false,
  });
  if (detail) return <Outlet />;
  return <MyBookings />;
}

function MyBookings() {
  const { focus } = Route.useSearch();
  return (
    <DesktopPageSplit
      mobile={<BookingsMobile focus={focus} />}
      desktop={<BookingsDesktopPage focus={focus} />}
    />
  );
}
