import type { BookingsPageState } from "../use-bookings-page";
import { BookingsListBody, BookingsPageHeader, BookingsTabs } from "../BookingsBlocks";

export function BookingsLayout5Split({ state }: { state: BookingsPageState }) {
  return (
    <div className="space-y-6">
      <BookingsPageHeader state={state} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <BookingsTabs state={state} />
          <BookingsListBody state={state} variant="rows" />
        </div>
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-card lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qisqa ko&apos;rinish</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Jami</dt>
              <dd className="font-semibold tabular-nums">{state.stats.total}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Yangi</dt>
              <dd className="font-semibold tabular-nums">{state.stats.pending}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Davom etmoqda</dt>
              <dd className="font-semibold tabular-nums">{state.stats.active}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Bugun</dt>
              <dd className="font-semibold tabular-nums">{state.stats.today}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
