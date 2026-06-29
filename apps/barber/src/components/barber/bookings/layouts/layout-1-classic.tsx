import type { BookingsPageState } from "../use-bookings-page";
import {
  BookingsListBody,
  BookingsPageHeader,
  BookingsStatChips,
  BookingsTabs,
} from "../BookingsBlocks";

export function BookingsLayout1Classic({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-6">
      <BookingsPageHeader state={state} />
      <BookingsStatChips state={state} />
      <BookingsTabs state={state} />
      <BookingsListBody state={state} variant="cards" />
    </div>
  );
}
