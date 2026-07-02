import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, MessageSquare, Phone, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import { BookingQrCheckInPanel } from "@/components/bookings/BookingQrCheckInPanel";
import { CompleteBookingSheet } from "@/components/bookings/CompleteBookingSheet";
import {
  BookingFlowActionRail,
  BookingFlowExitLink,
} from "@/components/bookings/BookingFlowActionRail";
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
  onComplete: (options: CompleteBookingOptions) => void | Promise<void>;
  completeSuccess?: boolean;
  onSaveImpressions?: (kinds: import("@/lib/client-impressions").ClientImpressionKind[]) => Promise<void> | void;
  impressionsBusy?: boolean;
  onFlowClosed?: () => void;
  wide?: boolean;
};

type FlowStage = "qr" | "session";

const stageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

function InChairHero({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-foreground px-6 py-6 text-background lg:flex-row lg:justify-between lg:px-8 lg:py-7">
      <div className="flex items-center gap-4">
        <div className="relative grid size-14 place-items-center sm:size-16">
          {active ? (
            <>
              <span className="session-pulse-ring absolute inset-0 rounded-full bg-background/20" aria-hidden />
              <span
                className="session-pulse-ring session-pulse-ring--delay absolute inset-0 rounded-full bg-background/20"
                aria-hidden
              />
            </>
          ) : null}
          <span className="relative grid size-11 place-items-center rounded-full bg-background text-foreground sm:size-12">
            <Scissors className="size-5" />
          </span>
        </div>
        <div>
          <p className="font-heading text-lg font-semibold sm:text-xl">Mijoz kresloda</p>
          <p className="text-sm text-background/75">Xizmat davom etmoqda</p>
        </div>
      </div>
      <div className="hidden rounded-xl bg-background/10 px-4 py-2 text-center text-sm text-background/80 lg:block">
        Taymer va tugatish pastdagi panelda
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
  onComplete,
  completeSuccess = false,
  onSaveImpressions,
  impressionsBusy,
  onFlowClosed,
  wide = false,
}: Props) {
  const [completeOpen, setCompleteOpen] = useState(false);
  const [flowDone, setFlowDone] = useState(false);

  const checkedIn = !!booking.checked_in_at;
  const isSession = booking.status === "in_progress";
  const stage: FlowStage = isSession ? "session" : "qr";

  useEffect(() => {
    if (autoOpenComplete && isSession) {
      const id = window.setTimeout(() => setCompleteOpen(true), 300);
      return () => window.clearTimeout(id);
    }
  }, [autoOpenComplete, isSession]);

  useEffect(() => {
    if (completeSuccess) {
      setCompleteOpen(true);
    }
  }, [completeSuccess]);

  const handleCompleteOpenChange = (open: boolean) => {
    setCompleteOpen(open);
    if (!open && flowDone) {
      onFlowClosed?.();
    }
  };

  const handleFlowFinished = () => {
    setFlowDone(true);
  };

  const phone = booking.client_phone?.trim();
  const phoneE164 = phone ? formatUzPhoneE164(phone) : null;
  const maxW = wide ? "max-w-[1400px]" : "max-w-lg";

  return (
    <div className={`booking-unified-flow mx-auto w-full ${maxW}`}>
      <AnimatePresence mode="wait">
        {stage === "qr" ? (
          <motion.div key="qr" {...stageMotion}>
            {wide ? (
              <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-stretch lg:min-h-[min(560px,72vh)]">
                <div className="space-y-4">
                  <BookingDetailSummary
                    booking={booking}
                    clientVisits={clientVisits}
                    clientQuery={clientQuery}
                    onChat={onChat}
                  />
                  <BookingPaymentCard booking={booking} />
                  <BookingOrderNumberBanner orderNumber={booking.order_number} />
                  <BookingNotesCard notes={booking.notes} />
                </div>
                <BookingQrCheckInPanel wide />
              </div>
            ) : (
              <div className="relative min-h-[min(480px,68vh)]">
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-[0.18] blur-[1px]"
                  aria-hidden
                >
                  <div className="grid gap-4">
                    <BookingDetailSummary
                      booking={booking}
                      clientVisits={clientVisits}
                      clientQuery={clientQuery}
                      onChat={onChat}
                    />
                    <BookingPaymentCard booking={booking} />
                  </div>
                </div>
                <div className="relative z-10 flex min-h-[inherit] items-center justify-center px-1 py-4">
                  <div className="w-full max-w-md">
                    <BookingQrCheckInPanel />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}

        {stage === "session" ? (
          <motion.div key="session" {...stageMotion} className="space-y-5 pb-4">
            <InChairHero active />
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
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

      <BookingFlowActionRail maxWidthClass={maxW}>
        <BookingFlowExitLink />
        {stage === "session" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setCompleteOpen(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Xizmatni tugatish
          </button>
        ) : null}
      </BookingFlowActionRail>

      <CompleteBookingSheet
        open={completeOpen}
        onOpenChange={handleCompleteOpenChange}
        booking={booking}
        busy={busy}
        onConfirm={onComplete}
        onSaveImpressions={onSaveImpressions}
        impressionsBusy={impressionsBusy}
        onFinished={handleFlowFinished}
      />
    </div>
  );
}
