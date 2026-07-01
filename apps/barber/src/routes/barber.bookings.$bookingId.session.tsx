import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { BookingSessionFlow } from "@/components/bookings/BookingSessionFlow";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";

type SessionSearch = {
  finish?: boolean;
};

export const Route = createFileRoute("/barber/bookings/$bookingId/session")({
  validateSearch: (raw: Record<string, unknown>): SessionSearch => ({
    finish: raw.finish === "1" || raw.finish === 1 || raw.finish === true,
  }),
  component: BarberBookingSessionPage,
});

function BarberBookingSessionPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { finish } = Route.useSearch();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  const { complete, busy } = useBookingWorkflowActions(bookingId);
  useBookingLiveSync(bookingId);

  const inProgress = booking?.status === "in_progress";
  const initialStep = finish ? 2 : 0;

  return (
    <div className="booking-session min-h-[calc(100dvh-4rem)] px-4 pb-32 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <Link
          to="/barber/bookings/$bookingId"
          params={{ bookingId }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Bron tafsilotlari
        </Link>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl bg-card shadow-card">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {(error as Error).message || "Bron yuklanmadi"}
          </div>
        ) : booking && inProgress ? (
          <BookingSessionFlow
            booking={booking}
            bookingId={bookingId}
            busy={busy}
            initialStep={initialStep}
            autoOpenComplete={finish === true}
            onChat={() => void navigate({ to: "/barber/chat" })}
            onComplete={(opts) =>
              complete(opts, {
                onSuccess: () => {
                  void navigate({
                    to: "/barber/bookings/$bookingId",
                    params: { bookingId },
                  });
                },
              })
            }
          />
        ) : booking ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            Bu bron hozir faol seansda emas.{" "}
            <Link
              to="/barber/bookings/$bookingId"
              params={{ bookingId }}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Tafsilotlarga qaytish
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
