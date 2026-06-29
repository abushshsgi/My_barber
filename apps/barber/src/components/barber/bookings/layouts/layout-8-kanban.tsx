import type { BookingsPageState } from "../use-bookings-page";
import { BookingsKanban, BookingsPageHeader, BookingsSearch } from "../BookingsBlocks";

export function BookingsLayout8Kanban({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-6">
      <BookingsPageHeader state={state} />
      <BookingsSearch state={state} variant="underline" />
      <BookingsKanban state={state} />
    </div>
  );
}
