import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { BookingUnifiedFlow } from "@/components/bookings/BookingUnifiedFlow";
import { BookingQueryError } from "@/components/bookings/BookingQueryError";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { useBookingClientInfo } from "@/hooks/use-booking-client-info";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";

type FlowSearch = {
  finish?: boolean;
};

export const Route = createFileRoute("/barber/bookings/$bookingId/check-in")({
  validateSearch: (raw: Record<string, unknown>): FlowSearch => ({
    finish: raw.finish === "1" || raw.finish === 1 || raw.finish === true,
  }),
  component: BarberBookingFlowPage,
});

function FlowPageContent({
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
  const [completeSuccess, setCompleteSuccess] = useState(false);

  const handleStart = useCallback(() => {
    runAction("start", { navigateOnFlow: false });
  }, [runAction]);

  const active =
    booking.status === "accepted" || booking.status === "in_progress";

  if (!active) {
    return (
      <div className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        Bu bron faol jarayonda emas.{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() =>
            void navigate({ to: "/barber/bookings/$bookingId", params: { bookingId } })
          }
        >
          Tafsilotlarga qaytish
        </button>
      </div>
    );
  }

  return (
    <BookingUnifiedFlow
      booking={booking}
      bookingId={bookingId}
      clientVisits={clientInfo.visits}
      clientQuery={clientInfo.query}
      busy={busy}
      autoOpenComplete={autoOpenComplete}
      completeSuccess={completeSuccess}
      wide={wide}
      onChat={() => void navigate({ to: "/barber/chat" })}
      onStart={handleStart}
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

function BarberBookingFlowPage() {
  const { bookingId } = Route.useParams();
  const { finish } = Route.useSearch();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);

  const shell = (wide?: boolean) => (
    <div
      className={
        wide
          ? "min-h-[calc(100dvh-4rem)] px-8 pb-32 pt-6 lg:px-12"
          : "min-h-[calc(100dvh-4rem)] px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
      }
    >
      <div className={wide ? "mx-auto w-full max-w-[1400px]" : "mx-auto w-full max-w-lg"}>
        <Link
          to="/barber/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Bronlar ro&apos;yxati
        </Link>

        {isLoading ? (
          <div className="mt-6 flex h-56 items-center justify-center rounded-2xl bg-card shadow-card">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="mt-6">
            <BookingQueryError error={error} />
          </div>
        ) : booking ? (
          <div className="mt-6">
            <FlowPageContent
              booking={booking}
              bookingId={bookingId}
              autoOpenComplete={finish === true}
              wide={wide}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  return <DesktopPageSplit mobile={shell()} desktop={shell(true)} />;
}
