import type { BookingsPageState } from "../use-bookings-page";
import { BookingsListBody, BookingsSearch, BookingsTabs } from "../BookingsBlocks";

export function BookingsLayout3Compact({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-semibold">Bronlar</h1>
        <BookingsSearch state={state} className="w-full sm:max-w-xs" variant="pill" />
      </div>
      <BookingsTabs state={state} variant="segmented" />
      <BookingsListBody state={state} variant="compact" />
    </div>
  );
}
