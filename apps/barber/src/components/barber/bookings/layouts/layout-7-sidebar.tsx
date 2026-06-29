import type { BookingsPageState } from "../use-bookings-page";
import { BookingsListBody, BookingsSidebarFilters } from "../BookingsBlocks";

export function BookingsLayout7Sidebar({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Bronlar</h1>
      <BookingsSidebarFilters state={state}>
        <BookingsListBody state={state} variant="cards" />
      </BookingsSidebarFilters>
    </div>
  );
}
