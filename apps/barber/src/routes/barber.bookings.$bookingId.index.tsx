import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BarberBookingActionBar } from "@/components/bookings/BarberBookingActionBar";
import { BookingDetailFlow } from "@/components/bookings/BookingDetailFlow";
import { CompleteBookingSheet } from "@/components/bookings/CompleteBookingSheet";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { useBookingClientInfo } from "@/hooks/use-booking-client-info";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";

export const Route = createFileRoute("/barber/bookings/$bookingId/")({
  component: BarberBookingOverviewPage,
});

function BookingDetailContent({
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
  const { runAction, complete, busy } = useBookingWorkflowActions(bookingId);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSuccess, setCompleteSuccess] = useState(false);

  const hasActionBar = !["completed", "cancelled", "rejected"].includes(booking.status);

  return (
    <>
      <BookingDetailFlow
        booking={booking}
        bookingId={bookingId}
        clientVisits={clientInfo.visits}
        clientQuery={clientInfo.query}
        onChat={() => void navigate({ to: "/barber/chat" })}
        hasActionBar={hasActionBar}
        wide={wide}
      />

      <CompleteBookingSheet
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        booking={booking}
        busy={busy}
        completed={completeSuccess}
        onConfirm={(opts) =>
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

      {hasActionBar ? (
        <BarberBookingActionBar
          booking={booking}
          bookingId={bookingId}
          busy={busy}
          onReject={() => runAction("reject")}
          onAccept={() => runAction("accept")}
          onStart={() => runAction("start")}
          onComplete={() => setCompleteOpen(true)}
          maxWidthClass={wide ? "max-w-4xl" : "max-w-lg"}
        />
      ) : null}
    </>
  );
}

function BarberBookingOverviewPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  useBookingLiveSync(bookingId);

  useEffect(() => {
    if (!booking) return;
    if (booking.status === "accepted") {
      void navigate({
        to: "/barber/bookings/$bookingId/check-in",
        params: { bookingId },
        replace: true,
      });
    }
    if (booking.status === "in_progress") {
      void navigate({
        to: "/barber/bookings/$bookingId/session",
        params: { bookingId },
        replace: true,
      });
    }
  }, [booking, bookingId, navigate]);

  const shell = (wide?: boolean) => (
    <div
      className={
        wide
          ? "booking-detail-page min-h-[calc(100dvh-4rem)] px-6 pb-32 pt-6 lg:px-10"
          : "booking-detail-page min-h-[calc(100dvh-4rem)] px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
      }
    >
      <div className={wide ? "mx-auto max-w-4xl" : "mx-auto max-w-lg"}>
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
        ) : booking && booking.status === "pending" ? (
          <BookingDetailContent booking={booking} bookingId={bookingId} wide={wide} />
        ) : booking ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Yo&apos;naltirilmoqda…
          </div>
        ) : null}
      </div>
    </div>
  );

  return <DesktopPageSplit mobile={shell()} desktop={shell(true)} />;
}
