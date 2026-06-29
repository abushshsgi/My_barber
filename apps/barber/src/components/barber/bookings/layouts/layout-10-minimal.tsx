import type { BookingsPageState } from "../use-bookings-page";
import { BookingsListBody, BookingsSearch, BookingsTabs } from "../BookingsBlocks";

export function BookingsLayout10Minimal({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold">Bronlar</h1>
        <BookingsSearch state={state} className="w-full max-w-sm" variant="underline" />
      </div>
      <BookingsTabs state={state} variant="underline" />
      <BookingsListBody state={state} variant="compact" />
    </div>
  );
}
