import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { BookingConfirmFlow } from "@/components/bookings/BookingConfirmFlow";
import { BookingQueryError } from "@/components/bookings/BookingQueryError";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { useBookingClientInfo } from "@/hooks/use-booking-client-info";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";

export const Route = createFileRoute("/barber/bookings/$bookingId/check-in")({
  component: BarberBookingCheckInPage,
});

function ConfirmPageContent({
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

  const handleStart = useCallback(() => {
    runAction("start", { navigateOnFlow: true });
  }, [runAction]);

  return (
    <BookingConfirmFlow
      booking={booking}
      bookingId={bookingId}
      clientVisits={clientInfo.visits}
      clientQuery={clientInfo.query}
      busy={busy}
      onChat={() => void navigate({ to: "/barber/chat" })}
      onStart={handleStart}
    />
  );
}

function BarberBookingCheckInPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  useBookingLiveSync(bookingId);

  useEffect(() => {
    if (booking?.status === "in_progress") {
      void navigate({
        to: "/barber/bookings/$bookingId/session",
        params: { bookingId },
        replace: true,
      });
    }
  }, [booking?.status, bookingId, navigate]);

  const shell = (wide?: boolean) => (
    <div
      className={
        wide
          ? "min-h-[calc(100dvh-4rem)] space-y-5 px-6 pb-12 pt-6 lg:px-10"
          : "min-h-[calc(100dvh-4rem)] space-y-5 p-4 pb-12 sm:p-6"
      }
    >
      <div className={wide ? "mx-auto max-w-4xl" : "mx-auto max-w-lg"}>
        <Link
          to="/barber/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Bronlar ro&apos;yxati
        </Link>

        {isLoading ? (
          <div className="mt-5 flex h-56 items-center justify-center rounded-2xl bg-card shadow-card">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="mt-5">
            <BookingQueryError error={error} />
          </div>
        ) : booking?.status === "in_progress" ? (
          <div className="mt-5 flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Seans sahifasiga yo&apos;naltirilmoqda…
          </div>
        ) : booking?.status === "accepted" ? (
          <div className="mt-5">
            <ConfirmPageContent booking={booking} bookingId={bookingId} wide={wide} />
          </div>
        ) : booking ? (
          <div className="mt-5 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
            Bu bron tasdiqlash bosqichida emas.{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() =>
                void navigate({ to: "/barber/bookings/$bookingId", params: { bookingId } })
              }
            >
              Orqaga
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return <DesktopPageSplit mobile={shell()} desktop={shell(true)} />;
}
