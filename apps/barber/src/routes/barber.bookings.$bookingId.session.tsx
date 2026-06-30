import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Scissors } from "lucide-react";
import { useState } from "react";
import { CompleteBookingDialog } from "@/components/bookings/CompleteBookingDialog";
import {
  BookingContactRow,
  BookingNotesCard,
  BookingProcessSection,
  BookingServiceTimer,
} from "@/components/bookings/BookingProcessParts";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import { useBookingWorkflowActions } from "@/hooks/use-booking-workflow";
import { useBarberBookingQuery } from "@/hooks/use-barber-queries";

export const Route = createFileRoute("/barber/bookings/$bookingId/session")({
  component: BarberBookingSessionPage,
});

function InChairIndicator({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-foreground p-6 text-background shadow-card">
      <div className="relative grid size-16 place-items-center">
        {active ? (
          <>
            <motion.span
              className="absolute inset-0 rounded-full bg-background/20"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute inset-0 rounded-full bg-background/20"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
            />
          </>
        ) : null}
        <span className="relative grid size-12 place-items-center rounded-full bg-background text-foreground">
          <Scissors className="size-5" />
        </span>
      </div>
      <div className="text-center">
        <p className="font-heading text-base font-semibold">Mijoz kresloda</p>
        <p className="mt-0.5 text-xs text-background/70">Xizmat davom etmoqda</p>
      </div>
    </div>
  );
}

function BarberBookingSessionPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  const { complete, busy } = useBookingWorkflowActions(bookingId);
  const [completeOpen, setCompleteOpen] = useState(false);
  useBookingLiveSync(bookingId);

  const inProgress = booking?.status === "in_progress";

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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start lg:gap-5">
            <div className="space-y-4">
              <InChairIndicator active={inProgress} />
              <div className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
                <p className="font-heading text-base font-semibold">{booking.client}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{booking.service}</p>
              </div>
              <BookingContactRow
                phone={booking.client_phone}
                onChat={() => void navigate({ to: "/barber/chat" })}
              />
            </div>

            <div className="space-y-4">
              <BookingServiceTimer booking={booking} />
              <BookingProcessSection status={booking.status} checkedIn={!!booking.checked_in_at} />
              <BookingNotesCard notes={booking.notes} />
            </div>
          </div>

          <CompleteBookingDialog
            open={completeOpen}
            onOpenChange={setCompleteOpen}
            booking={booking}
            busy={busy}
            onConfirm={(opts) =>
              complete(opts, {
                onSuccess: () => {
                  setCompleteOpen(false);
                  void navigate({
                    to: "/barber/bookings/$bookingId",
                    params: { bookingId },
                  });
                },
              })
            }
          />
        </>
      ) : null}

      {inProgress ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-[900px] items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setCompleteOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Tugatish
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
