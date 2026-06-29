import type { BookingsPageState } from "../use-bookings-page";
import {
  BookingsListBody,
  BookingsPageHeader,
  BookingsStatChips,
  BookingsTabs,
  BookingCard,
} from "../BookingsBlocks";

export function BookingsLayout4Cards({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-6">
      <BookingsPageHeader state={state} />
      <BookingsStatChips state={state} />
      <BookingsTabs state={state} />
      {state.isLoading || state.filtered.length === 0 ? (
        <BookingsListBody state={state} variant="cards" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.filtered.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
