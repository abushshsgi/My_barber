import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, ScanLine, Scissors } from "lucide-react";
import { useState } from "react";
import { BarberPendingResponseBanner } from "@/components/bookings/BarberPendingResponseBanner";
import { BarberBookingActionBar } from "@/components/bookings/BarberBookingActionBar";
import { CompleteBookingDialog } from "@/components/bookings/CompleteBookingDialog";
import {
  BookingAddonHint,
  BookingDetailSummary,
  BookingNotesCard,
  BookingOrderNumberBanner,
  BookingProcessSection,
  BookingResultPreview,
  BookingServiceTimer,
  BookingStatusHistory,
  BookingWaitCountdown,
} from "@/components/bookings/BookingProcessParts";
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

  return (
    <div className="mx-auto max-w-[960px] space-y-4 p-4 pb-28 sm:space-y-5 sm:p-6 lg:p-8">
      <Link
        to="/barber/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
          {booking.status === "pending" ? (
            <BarberPendingResponseBanner booking={booking} />
          ) : null}

          <BookingDetailSummary
            booking={booking}
            clientVisits={clientInfo.visits}
            clientQuery={clientInfo.query}
            onChat={() => void navigate({ to: "/barber/chat" })}
          />

          <BookingProcessSection status={booking.status} checkedIn={!!booking.checked_in_at} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] lg:items-start lg:gap-5">
            <div className="space-y-4">
              <BookingNotesCard notes={booking.notes} />

              {booking.status === "accepted" ? (
                <Link
                  to="/barber/bookings/$bookingId/check-in"
                  params={{ bookingId }}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-background shadow-card transition-opacity hover:opacity-90"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ScanLine className="size-4" />
                    {booking.checked_in_at ? "Xizmatni boshlash sahifasi" : "Mijozni qabul qilish sahifasi"}
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              ) : null}

              {booking.status === "in_progress" ? (
                <Link
                  to="/barber/bookings/$bookingId/session"
                  params={{ bookingId }}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-background shadow-card transition-opacity hover:opacity-90"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Scissors className="size-4" />
                    Kresloda — jarayon sahifasi
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              ) : null}

              <BookingResultPreview url={booking.result_image_url} />

              {booking.status === "in_progress" ? (
                <BookingAddonHint onChat={() => void navigate({ to: "/barber/chat" })} />
              ) : null}
            </div>

            <aside className="space-y-3 sm:col-span-2 lg:col-span-1 lg:sticky lg:top-20">
              <BookingWaitCountdown booking={booking} />
              <BookingServiceTimer booking={booking} />
              <BookingOrderNumberBanner orderNumber={booking.order_number} />
              <BookingStatusHistory history={booking.status_history} />
            </aside>
          </div>

          <CompleteBookingDialog
            open={completeOpen}
            onOpenChange={setCompleteOpen}
            booking={booking}
            busy={busy}
            onConfirm={(opts) => complete(opts, { onSuccess: () => setCompleteOpen(false) })}
          />
        </>
      ) : null}

      {booking && !["completed", "cancelled", "rejected"].includes(booking.status) ? (
        <BarberBookingActionBar
          booking={booking}
          bookingId={bookingId}
          busy={busy}
          onReject={() => runAction("reject")}
          onAccept={() => runAction("accept")}
          onStart={() => runAction("start")}
          onComplete={() => setCompleteOpen(true)}
        />
      ) : null}
    </div>
  );
}
