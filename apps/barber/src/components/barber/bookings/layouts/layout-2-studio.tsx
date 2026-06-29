import type { BookingsPageState } from "../use-bookings-page";
import {
  BookingsListBody,
  BookingsPageHeader,
  BookingsStatChips,
  BookingsTabs,
  BookingCard,
} from "../BookingsBlocks";

export function BookingsLayout2Studio({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-8">
      <BookingsPageHeader state={state} />
      <div className="rounded-3xl border border-border bg-gradient-to-b from-muted/30 to-card p-6">
        <BookingsStatChips state={state} />
      </div>
      <BookingsTabs state={state} variant="underline" />
      {state.isLoading || state.filtered.length === 0 ? (
        <BookingsListBody state={state} variant="cards" />
      ) : (
        <div className="space-y-4">
          {state.filtered.map((b) => (
            <BookingCard key={b.id} booking={b} density="large" />
          ))}
        </div>
      )}
    </div>
  );
}
