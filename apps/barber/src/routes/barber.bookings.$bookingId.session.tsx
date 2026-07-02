import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { BookingSessionFlow } from "@/components/bookings/BookingSessionFlow";
import { BookingQueryError } from "@/components/bookings/BookingQueryError";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
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

function SessionPageContent({
  booking,
  bookingId,
  autoOpenComplete,
  wide,
}: {
  booking: NonNullable<ReturnType<typeof useBarberBookingQuery>["data"]>;
  bookingId: string;
  autoOpenComplete?: boolean;
  wide?: boolean;
}) {
  const navigate = useNavigate();
  const { complete, busy } = useBookingWorkflowActions(bookingId);
  const [completeSuccess, setCompleteSuccess] = useState(false);

  return (
    <BookingSessionFlow
      booking={booking}
      bookingId={bookingId}
      busy={busy}
      autoOpenComplete={autoOpenComplete}
      completeSuccess={completeSuccess}
      wide={wide}
      onChat={() => void navigate({ to: "/barber/chat" })}
      onComplete={(opts) =>
        complete(opts, {
          onSuccess: () => {
            setCompleteSuccess(true);
            window.setTimeout(() => {
              void navigate({ to: "/barber/bookings" });
            }, 2800);
          },
        })
      }
    />
  );
}

function BarberBookingSessionPage() {
  const { bookingId } = Route.useParams();
  const { finish } = Route.useSearch();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  useBookingLiveSync(bookingId);

  const inProgress = booking?.status === "in_progress";

  const shell = (wide?: boolean) => (
    <div
      className={
        wide
          ? "booking-session min-h-[calc(100dvh-4rem)] px-6 pb-32 pt-6 lg:px-10"
          : "booking-session min-h-[calc(100dvh-4rem)] px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
      }
    >
      <div className={wide ? "mx-auto max-w-4xl" : "mx-auto max-w-lg"}>
        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl bg-card shadow-card">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <BookingQueryError error={error} />
        ) : booking && inProgress ? (
          <SessionPageContent
            booking={booking}
            bookingId={bookingId}
            autoOpenComplete={finish === true}
            wide={wide}
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

  return <DesktopPageSplit mobile={shell()} desktop={shell(true)} />;
}
