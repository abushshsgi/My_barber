import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { BookingsLayoutSwitcher } from "@/components/barber/bookings/BookingsBlocks";
import { BookingsLayoutView } from "@/components/barber/bookings/layouts";
import type { BookingsLayoutId } from "@/components/barber/bookings/types";
import { useBookingsPage } from "@/components/barber/bookings/use-bookings-page";

function parseLayout(raw: unknown): BookingsLayoutId {
  const n = Number(raw);
  if (n >= 1 && n <= 10) return n as BookingsLayoutId;
  return 1;
}

export const Route = createFileRoute("/barber/bookings")({
  component: BookingsRoute,
  validateSearch: (raw: Record<string, unknown>) => ({
    layout: parseLayout(raw.layout),
  }),
});

function BookingsRoute() {
  const detail = useMatch({
    from: "/barber/bookings/$bookingId",
    shouldThrow: false,
  });
  if (detail) return <Outlet />;
  return <BookingsPage />;
}

function BookingsPage() {
  const { layout } = Route.useSearch();
  const state = useBookingsPage();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      <BookingsLayoutSwitcher current={layout} />
      <BookingsLayoutView layout={layout} state={state} />
    </div>
  );
}
