import type { BookingsPageState } from "../use-bookings-page";
import { BookingsListBody, BookingsPageHeader, BookingsStatChips, BookingsTabs } from "../BookingsBlocks";

export function BookingsLayout6Stacked({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-5">
      <BookingsPageHeader state={state} />
      <div className="space-y-5 rounded-2xl border border-border bg-surface/50 p-5">
        <BookingsStatChips state={state} />
        <BookingsTabs state={state} variant="underline" />
        <BookingsListBody state={state} variant="rows" />
      </div>
    </div>
  );
}
