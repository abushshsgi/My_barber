import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { BarberBookingActionBar } from "@/components/bookings/BarberBookingActionBar";
import { BookingDetailFlow } from "@/components/bookings/BookingDetailFlow";
import { BookingUnifiedFlow } from "@/components/bookings/BookingUnifiedFlow";
import { BookingQueryError } from "@/components/bookings/BookingQueryError";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { useBookingClientInfo } from "@/hooks/use-booking-client-info";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useSaveClientImpressionsMutation, useBarberBookingQuery } from "@/hooks/use-barber-queries";

type BookingSearch = {
  finish?: boolean;
};

export const Route = createFileRoute("/barber/bookings/$bookingId/")({
  validateSearch: (raw: Record<string, unknown>): BookingSearch => ({
    finish: raw.finish === "1" || raw.finish === 1 || raw.finish === true,
  }),
  component: BarberBookingOverviewPage,
});

function BookingPendingContent({
  booking,
  bookingId,
  wide,
}: {
  booking: NonNullable<ReturnType<typeof useBarberBookingQuery>["data"]>;
  bookingId: string;
  wide?: boolean;
}) {
  const navigate = useNavigate();
  const clientInfo = useBookingClientInfo(booking);
  const { runAction, busy } = useBookingWorkflowActions(bookingId);

  return (
    <>
      <BookingDetailFlow
        booking={booking}
        bookingId={bookingId}
        clientVisits={clientInfo.visits}
        clientQuery={clientInfo.query}
        onChat={() => void navigate({ to: "/barber/chat" })}
        hasActionBar
        wide={wide}
      />
      <BarberBookingActionBar
        booking={booking}
        bookingId={bookingId}
        busy={busy}
        onReject={() => runAction("reject")}
        onAccept={() => runAction("accept")}
        maxWidthClass={wide ? "max-w-4xl" : "max-w-lg"}
      />
    </>
  );
}

function BookingActiveFlowContent({
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
  const clientInfo = useBookingClientInfo(booking);
  const { runAction, complete, busy } = useBookingWorkflowActions(bookingId);
  const impressionsMut = useSaveClientImpressionsMutation();
  const [completeSuccess, setCompleteSuccess] = useState(false);

  const handleStart = useCallback(() => {
    runAction("start");
  }, [runAction]);

  const handleFlowClosed = useCallback(
    (wasComplete: boolean) => {
      if (wasComplete) {
        void navigate({ to: "/barber/bookings" });
      }
    },
    [navigate],
  );

  return (
    <BookingUnifiedFlow
      booking={booking}
      bookingId={bookingId}
      clientVisits={clientInfo.visits}
      clientQuery={clientInfo.query}
      busy={busy}
      autoOpenComplete={autoOpenComplete}
      completeSuccess={completeSuccess}
      impressionsBusy={impressionsMut.isPending}
      wide={wide}
      onChat={() => void navigate({ to: "/barber/chat" })}
      onStart={handleStart}
      onSaveImpressions={(kinds) =>
        impressionsMut.mutateAsync({ bookingId, kinds })
      }
      onComplete={(opts) =>
        complete(opts, {
          onSuccess: () => setCompleteSuccess(true),
        })
      }
      onFlowClosed={handleFlowClosed}
    />
  );
}

function BarberBookingOverviewPage() {
  const { bookingId } = Route.useParams();
  const { finish } = Route.useSearch();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);

  const shell = (wide?: boolean) => (
    <div
      className={
        wide
          ? "booking-detail-page min-h-[calc(100dvh-4rem)] px-6 pb-32 pt-6 lg:px-10"
          : "booking-detail-page min-h-[calc(100dvh-4rem)] px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
      }
    >
      <div className={wide ? "mx-auto w-full max-w-[1400px]" : "mx-auto w-full max-w-lg"}>
        <Link
          to="/barber/bookings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Barcha bronlar
        </Link>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl bg-card shadow-card">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <BookingQueryError error={error} />
        ) : booking?.status === "pending" ? (
          <BookingPendingContent booking={booking} bookingId={bookingId} wide={wide} />
        ) : booking?.status === "accepted" || booking?.status === "in_progress" ? (
          <BookingActiveFlowContent
            booking={booking}
            bookingId={bookingId}
            autoOpenComplete={finish === true}
            wide={wide}
          />
        ) : booking ? (
          <BookingDetailFlow
            booking={booking}
            bookingId={bookingId}
            wide={wide}
          />
        ) : null}
      </div>
    </div>
  );

  return <DesktopPageSplit mobile={shell()} desktop={shell(true)} />;
}
