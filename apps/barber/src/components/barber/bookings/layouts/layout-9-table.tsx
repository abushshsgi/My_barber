import type { BookingsPageState } from "../use-bookings-page";
import { BookingsListBody, BookingsPageHeader, BookingsTabs } from "../BookingsBlocks";

export function BookingsLayout9Table({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-6">
      <BookingsPageHeader state={state} />
      <BookingsTabs state={state} variant="pills" />
      <BookingsListBody state={state} variant="table" />
    </div>
  );
}
