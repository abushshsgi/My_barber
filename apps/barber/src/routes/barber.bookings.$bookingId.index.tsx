import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { BarberBookingActionBar } from "@/components/bookings/BarberBookingActionBar";
import { BookingDetailFlow } from "@/components/bookings/BookingDetailFlow";
import { CompleteBookingDialog } from "@/components/bookings/CompleteBookingDialog";
import { useBookingClientInfo } from "@/hooks/use-booking-client-info";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";

export const Route = createFileRoute("/barber/bookings/$bookingId/")({
  component: BarberBookingOverviewPage,
});

function BarberBookingOverviewPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  const clientInfo = useBookingClientInfo(booking);
  const { runAction, complete, busy } = useBookingWorkflowActions(bookingId);
  const [completeOpen, setCompleteOpen] = useState(false);
  useBookingLiveSync(bookingId);

  const hasActionBar =
    !!booking && !["completed", "cancelled", "rejected"].includes(booking.status);

  return (
    <div className="booking-detail-page min-h-[calc(100dvh-4rem)] px-4 pb-32 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="mx-auto max-w-lg">
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
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {(error as Error).message || "Bron yuklanmadi"}
          </div>
        ) : booking ? (
          <>
            <BookingDetailFlow
              booking={booking}
              bookingId={bookingId}
              clientVisits={clientInfo.visits}
              clientQuery={clientInfo.query}
              onChat={() => void navigate({ to: "/barber/chat" })}
              hasActionBar={hasActionBar}
            />

            <CompleteBookingDialog
              open={completeOpen}
              onOpenChange={setCompleteOpen}
              booking={booking}
              busy={busy}
              onConfirm={(opts) => complete(opts, { onSuccess: () => setCompleteOpen(false) })}
            />
          </>
        ) : null}
      </div>

      {booking && hasActionBar ? (
        <BarberBookingActionBar
          booking={booking}
          bookingId={bookingId}
          busy={busy}
          onReject={() => runAction("reject")}
          onAccept={() => runAction("accept")}
          onStart={() => runAction("start")}
          onComplete={() => setCompleteOpen(true)}
          maxWidthClass="max-w-lg"
        />
      ) : null}
    </div>
  );
}
