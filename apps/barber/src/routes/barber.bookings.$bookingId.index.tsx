import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Play,
  ScanLine,
  Scissors,
  X,
} from "lucide-react";
import { useState } from "react";
import { CompleteBookingDialog } from "@/components/bookings/CompleteBookingDialog";
import {
  BookingAddonHint,
  BookingContactRow,
  BookingDetailSummary,
  BookingNotesCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
  BookingProcessSection,
  BookingResultPreview,
  BookingServiceTimer,
  BookingStatusHero,
  BookingStatusHistory,
  BookingWaitCountdown,
} from "@/components/bookings/BookingProcessParts";
import { useBookingClientInfo } from "@/hooks/use-booking-client-info";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";
import { cn } from "@/lib/utils";

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
    <div className="mx-auto max-w-[1300px] space-y-5 p-4 pb-28 sm:p-6 lg:p-8">
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
          <BookingStatusHero booking={booking} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-5">
            <div className="space-y-4">
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

              <BookingProcessSection status={booking.status} checkedIn={!!booking.checked_in_at} />

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

              <BookingStatusHistory history={booking.status_history} />
              <BookingResultPreview url={booking.result_image_url} />

              {booking.status === "in_progress" ? (
                <BookingAddonHint onChat={() => void navigate({ to: "/barber/chat" })} />
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20">
              <BookingWaitCountdown booking={booking} />
              <BookingServiceTimer booking={booking} />
              <BookingOrderNumberBanner orderNumber={booking.order_number} />
              <BookingPaymentCard booking={booking} />
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-[1300px] flex-wrap items-center gap-2">
            {busy ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Bajarilmoqda…
              </div>
            ) : (
              <>
                {booking.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => runAction("reject")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" />
                      Rad etish
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction("accept")}
                      className="inline-flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <CheckCircle2 className="size-4" />
                      Qabul qilish
                    </button>
                  </>
                ) : null}
                {booking.status === "accepted" ? (
                  booking.checked_in_at ? (
                    <button
                      type="button"
                      onClick={() => runAction("start")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <Play className="size-4" />
                      Boshlash
                    </button>
                  ) : (
                    <Link
                      to="/barber/bookings/$bookingId/check-in"
                      params={{ bookingId }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <ScanLine className="size-4 shrink-0" />
                      Mijozni qabul qilish
                    </Link>
                  )
                ) : null}
                {booking.status === "in_progress" ? (
                  <button
                    type="button"
                    onClick={() => setCompleteOpen(true)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                  >
                    <CheckCircle2 className="size-4" />
                    Tugatish
                  </button>
                ) : null}
                {(booking.status === "pending" || booking.status === "accepted") && (
                  <button
                    type="button"
                    onClick={() => runAction("cancel")}
                    className={cn(
                      "inline-flex items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted",
                      booking.status === "accepted" && "flex-1",
                    )}
                  >
                    Bekor
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
