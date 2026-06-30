import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Play } from "lucide-react";
import { BarberManualCheckInCard } from "@/components/bookings/BookingCheckInCard";
import {
  BookingContactRow,
  BookingDetailSummary,
  BookingNotesCard,
  BookingStatusHero,
} from "@/components/bookings/BookingProcessParts";
import { useBookingClientInfo } from "@/hooks/use-booking-client-info";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";

export const Route = createFileRoute("/barber/bookings/$bookingId/check-in")({
  component: BarberBookingCheckInPage,
});

function BarberBookingCheckInPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  const clientInfo = useBookingClientInfo(booking);
  const { runAction, busy } = useBookingWorkflowActions(bookingId);
  useBookingLiveSync(bookingId);

  const checkedIn = !!booking?.checked_in_at;

  return (
    <div className="mx-auto max-w-[900px] space-y-5 p-4 pb-28 sm:p-6 lg:p-8">
      <Link
        to="/barber/bookings/$bookingId"
        params={{ bookingId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
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
      ) : booking ? (
        <>
          <BookingStatusHero booking={booking} />

          {booking.status === "in_progress" ? (
            <Link
              to="/barber/bookings/$bookingId/session"
              params={{ bookingId }}
              className="flex items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3.5 text-background shadow-card transition-opacity hover:opacity-90"
            >
              <span className="text-sm font-semibold">Xizmat boshlangan — jarayon sahifasi</span>
              <ArrowRight className="size-4" />
            </Link>
          ) : null}

          <BookingDetailSummary
            booking={booking}
            clientVisits={clientInfo.visits}
            clientQuery={clientInfo.query}
          />

          <BookingContactRow
            phone={booking.client_phone}
            onChat={() => void navigate({ to: "/barber/chat" })}
          />

          <BookingNotesCard notes={booking.notes} />

          {booking.status === "accepted" ? (
            checkedIn ? (
              <div className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4" />
                  Mijoz qabul qilindi
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tayyor bo'lsangiz xizmatni boshlang.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction("start")}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Xizmatni boshlash
                </button>
              </div>
            ) : (
              <BarberManualCheckInCard />
            )
          ) : booking.status === "pending" ? (
            <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
              Avval bronni tasdiqlang. Keyin mijozni qabul qilish ochiladi.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
