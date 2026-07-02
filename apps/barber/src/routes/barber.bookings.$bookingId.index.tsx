import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BarberBookingActionBar } from "@/components/bookings/BarberBookingActionBar";
import { BookingCompletedSummary } from "@/components/bookings/BookingCompletedSummary";
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
        maxWidthClass={wide ? "max-w-[1400px]" : "max-w-lg"}
        onReject={() => runAction("reject")}
        onAccept={() => runAction("accept")}
        variant="fixed"
      />
    </>
  );
}

function BookingActiveFlowContent({
  booking,
  bookingId,
  autoOpenComplete,
  wide,
  onFlowLockChange,
}: {
  booking: NonNullable<ReturnType<typeof useBarberBookingQuery>["data"]>;
  bookingId: string;
  autoOpenComplete?: boolean;
  wide?: boolean;
  onFlowLockChange: (locked: boolean) => void;
}) {
  const navigate = useNavigate();
  const clientInfo = useBookingClientInfo(booking);
  const { complete, busy } = useBookingWorkflowActions(bookingId);
  const impressionsMut = useSaveClientImpressionsMutation();
  const [completeSuccess, setCompleteSuccess] = useState(false);

  useEffect(() => {
    onFlowLockChange(completeSuccess);
  }, [completeSuccess, onFlowLockChange]);

  const handleFlowClosed = useCallback(() => {
    onFlowLockChange(false);
    void navigate({ to: "/barber/bookings" });
  }, [navigate, onFlowLockChange]);

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
      onSaveImpressions={(kinds) => impressionsMut.mutateAsync({ bookingId, kinds })}
      onComplete={(opts) =>
        complete(opts, {
          onSuccess: () => setCompleteSuccess(true),
        })
      }
      onFlowClosed={handleFlowClosed}
    />
  );
}

function BookingTerminalContent({
  booking,
  wide,
}: {
  booking: NonNullable<ReturnType<typeof useBarberBookingQuery>["data"]>;
  wide?: boolean;
}) {
  const navigate = useNavigate();
  const clientInfo = useBookingClientInfo(booking);
  return (
    <BookingCompletedSummary
      booking={booking}
      clientVisits={clientInfo.visits}
      clientQuery={clientInfo.query}
      onChat={() => void navigate({ to: "/barber/chat" })}
      wide={wide}
    />
  );
}

function BarberBookingOverviewPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { finish } = Route.useSearch();
  const [autoOpenComplete] = useState(() => finish === true);
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  const [flowLocked, setFlowLocked] = useState(false);

  useEffect(() => {
    if (finish === true) {
      void navigate({
        to: "/barber/bookings/$bookingId",
        params: { bookingId },
        search: {},
        replace: true,
      });
    }
  }, [bookingId, finish, navigate]);

  const isTerminal =
    booking?.status === "completed" ||
    booking?.status === "cancelled" ||
    booking?.status === "rejected";

  const showActiveFlow =
    !isTerminal &&
    (booking?.status === "accepted" ||
      booking?.status === "in_progress" ||
      flowLocked);

  const shell = (wide?: boolean) => (
    <div
      className={
        wide
          ? "booking-detail-page min-h-[calc(100dvh-4rem)] px-6 pb-28 pt-6 lg:px-10"
          : "booking-detail-page min-h-[calc(100dvh-4rem)] px-4 pb-28 pt-4 sm:px-6 sm:pt-6"
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
        ) : showActiveFlow ? (
          <BookingActiveFlowContent
            booking={booking}
            bookingId={bookingId}
            autoOpenComplete={autoOpenComplete}
            wide={wide}
            onFlowLockChange={setFlowLocked}
          />
        ) : isTerminal ? (
          <BookingTerminalContent booking={booking} wide={wide} />
        ) : booking ? (
          <BookingDetailFlow booking={booking} bookingId={bookingId} wide={wide} />
        ) : null}
      </div>
    </div>
  );

  return <DesktopPageSplit mobile={shell()} desktop={shell(true)} />;
}
