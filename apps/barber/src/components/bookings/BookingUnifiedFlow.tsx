import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Phone,
  Scissors,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookingQrCheckInPanel } from "@/components/bookings/BookingQrCheckInPanel";
import { CompleteBookingSheet } from "@/components/bookings/CompleteBookingSheet";
import {
  BookingDetailSummary,
  BookingNotesCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
  BookingProcessSection,
  BookingServiceTimer,
} from "@/components/bookings/BookingProcessParts";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { UserAvatar } from "@/components/barber/primitives";
import type { CompleteBookingOptions } from "@/lib/map-booking";
import { formatUzPhoneE164 } from "@/lib/phone";

type Props = {
  booking: Booking;
  bookingId: string;
  clientVisits?: number;
  clientQuery?: string;
  busy?: boolean;
  autoOpenComplete?: boolean;
  onChat?: () => void;
  onStart: () => void;
  onComplete: (options: CompleteBookingOptions) => void;
  completeSuccess?: boolean;
  wide?: boolean;
};

type FlowStage = "qr" | "starting" | "session";

const stageMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

function InChairHero({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-foreground px-8 py-8 text-background lg:py-10">
      <div className="relative grid size-16 place-items-center sm:size-20">
        {active ? (
          <>
            <span className="session-pulse-ring absolute inset-0 rounded-full bg-background/20" aria-hidden />
            <span
              className="session-pulse-ring session-pulse-ring--delay absolute inset-0 rounded-full bg-background/20"
              aria-hidden
            />
          </>
        ) : null}
        <span className="relative grid size-12 place-items-center rounded-full bg-background text-foreground sm:size-14">
          <Scissors className="size-6" />
        </span>
      </div>
      <div className="text-center">
        <p className="font-heading text-xl font-semibold sm:text-2xl">Xizmat davom etmoqda</p>
        <p className="mt-1 text-sm text-background/70">Mijoz kresloda</p>
      </div>
    </div>
  );
}

export function BookingUnifiedFlow({
  booking,
  bookingId: _bookingId,
  clientVisits,
  clientQuery,
  busy,
  autoOpenComplete = false,
  onChat,
  onStart,
  onComplete,
  completeSuccess = false,
  wide = false,
}: Props) {
  const [completeOpen, setCompleteOpen] = useState(false);
  const autoStartedRef = useRef(false);

  const checkedIn = !!booking.checked_in_at;
  const isSession = booking.status === "in_progress";

  const stage: FlowStage = isSession ? "session" : checkedIn ? "starting" : "qr";

  useEffect(() => {
    if (!checkedIn || autoStartedRef.current || busy) return;
    if (booking.status !== "accepted") return;
    autoStartedRef.current = true;
    onStart();
  }, [checkedIn, booking.status, busy, onStart]);

  useEffect(() => {
    if (autoOpenComplete) {
      const id = window.setTimeout(() => setCompleteOpen(true), 450);
      return () => window.clearTimeout(id);
    }
  }, [autoOpenComplete]);

  useEffect(() => {
    if (completeSuccess) setCompleteOpen(true);
  }, [completeSuccess]);

  const handleCheckedIn = useCallback(() => {
    /* refetch via mutation invalidates booking query */
  }, []);

  const phone = booking.client_phone?.trim();
  const phoneE164 = phone ? formatUzPhoneE164(phone) : null;

  const maxW = wide ? "max-w-[1400px]" : "max-w-lg";

  const primaryLabel =
    stage === "starting" ? "Kresloda" : stage === "session" ? "Xizmatni tugatish" : null;

  return (
    <div className={`booking-unified-flow mx-auto w-full ${maxW}`}>
      <AnimatePresence mode="wait">
        {stage === "qr" ? (
          <motion.div key="qr" {...stageMotion} className="relative min-h-[min(560px,72vh)]">
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-[0.2] blur-[1.5px]"
              aria-hidden
            >
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                <BookingDetailSummary
                  booking={booking}
                  clientVisits={clientVisits}
                  clientQuery={clientQuery}
                  onChat={onChat}
                />
                <div className="space-y-4">
                  <BookingPaymentCard booking={booking} />
                  <BookingOrderNumberBanner orderNumber={booking.order_number} />
                  <BookingNotesCard notes={booking.notes} />
                </div>
              </div>
            </div>

            <div className="relative z-10 flex min-h-[inherit] items-center justify-center px-1 py-6">
              <div className="w-full max-w-md">
                <BookingQrCheckInPanel onCheckedIn={handleCheckedIn} />
              </div>
            </div>
          </motion.div>
        ) : null}

        {stage === "starting" ? (
          <motion.div
            key="starting"
            {...stageMotion}
            className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-border bg-card px-8 py-16 text-center shadow-card"
          >
            <Loader2 className="size-10 animate-spin text-foreground" />
            <h2 className="mt-6 font-heading text-xl font-semibold">Mijoz kresloda</h2>
            <p className="mt-2 text-sm text-muted-foreground">Xizmat boshlanmoqda…</p>
          </motion.div>
        ) : null}

        {stage === "session" ? (
          <motion.div key="session" {...stageMotion} className="space-y-6 pb-4">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
              <div className="space-y-4">
                <InChairHero active />
                <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      src={booking.client_avatar}
                      name={booking.client}
                      className="size-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-lg font-semibold">{booking.client}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{booking.service}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {booking.date} · <span className="tabular-nums">{booking.time}</span> ·{" "}
                        {booking.duration_min} daq
                      </p>
                    </div>
                    <p className="shrink-0 font-heading text-lg font-semibold tabular-nums">
                      {formatUZS(booking.price)}
                    </p>
                  </div>
                  {phoneE164 ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      <a
                        href={`tel:${phoneE164}`}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium sm:flex-none"
                      >
                        <Phone className="size-3.5" />
                        Qo&apos;ng&apos;iroq
                      </a>
                      <a
                        href={`sms:${phoneE164}`}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium sm:flex-none"
                      >
                        <MessageSquare className="size-3.5" />
                        SMS
                      </a>
                      {onChat ? (
                        <button
                          type="button"
                          onClick={onChat}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2.5 text-xs font-medium text-background sm:w-auto"
                        >
                          <MessageSquare className="size-3.5" />
                          Chat
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <BookingOrderNumberBanner orderNumber={booking.order_number} />
                <BookingNotesCard notes={booking.notes} />
              </div>
              <div className="space-y-4">
                <BookingServiceTimer booking={booking} className="w-full" />
                <BookingProcessSection status={booking.status} checkedIn={checkedIn} />
                <BookingPaymentCard booking={booking} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-sm">
        <div className={`mx-auto flex items-stretch gap-2 px-4 ${maxW}`}>
          <Link
            to="/barber/bookings"
            className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground"
          >
            Chiqish
          </Link>

          {primaryLabel ? (
            <button
              type="button"
              disabled={stage === "starting" || busy}
              onClick={() => {
                if (stage === "session") setCompleteOpen(true);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background disabled:opacity-70"
            >
              {stage === "starting" || busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {primaryLabel}
            </button>
          ) : null}
        </div>
      </div>

      <CompleteBookingSheet
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        booking={booking}
        busy={busy}
        completed={completeSuccess}
        onConfirm={onComplete}
      />
    </div>
  );
}
