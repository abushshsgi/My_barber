import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  History,
  Image as ImageIcon,
  Timer,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BarberPendingResponseBanner } from "@/components/bookings/BarberPendingResponseBanner";
import {
  BookingAddonHint,
  BookingDetailSummary,
  BookingNotesCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
  BookingProcessSection,
  BookingResultPreview,
  BookingServiceTimer,
  BookingStatusHistory,
  BookingWaitCountdown,
} from "@/components/bookings/BookingProcessParts";
import {
  BookingStepIndicator,
  bookingFlowSlide,
  type BookingStepMeta,
} from "@/components/bookings/BookingStepIndicator";
import type { Booking } from "@/components/barber/BarberContext";

const STEPS_BY_STATUS: Record<Booking["status"], readonly BookingStepMeta[]> = {
  pending: [{ id: "request", short: "So'rov", icon: ClipboardList }],
  accepted: [{ id: "client", short: "Mijoz", icon: User }],
  in_progress: [
    { id: "process", short: "Jarayon", icon: Timer },
    { id: "extra", short: "Qo'shimcha", icon: History },
  ],
  completed: [
    { id: "summary", short: "Xulosa", icon: BadgeCheck },
    { id: "result", short: "Natija", icon: ImageIcon },
  ],
  cancelled: [{ id: "summary", short: "Bron", icon: ClipboardList }],
  rejected: [{ id: "summary", short: "Bron", icon: ClipboardList }],
};

type Props = {
  booking: Booking;
  bookingId: string;
  clientVisits?: number;
  clientQuery?: string;
  onChat?: () => void;
  hasActionBar?: boolean;
  wide?: boolean;
};

export function BookingDetailFlow({
  booking,
  bookingId,
  clientVisits,
  clientQuery,
  onChat,
  hasActionBar = false,
  wide = false,
}: Props) {
  const steps = STEPS_BY_STATUS[booking.status] ?? STEPS_BY_STATUS.pending;
  const [step, setStep] = useState(0);
  const [entered, setEntered] = useState(false);
  const singleStep = steps.length === 1;
  const hideStepNav = hasActionBar || booking.status === "pending" || singleStep;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setStep((s) => Math.min(s, steps.length - 1));
  }, [booking.status, steps.length]);

  const stepContent = useMemo(() => {
    const checkedIn = !!booking.checked_in_at;

    if (booking.status === "pending") {
      return (
        <div className="space-y-4">
          <BarberPendingResponseBanner booking={booking} />
          <BookingDetailSummary
            booking={booking}
            clientVisits={clientVisits}
            clientQuery={clientQuery}
            onChat={onChat}
          />
          <BookingNotesCard notes={booking.notes} />
          <BookingPaymentCard booking={booking} />
          <BookingOrderNumberBanner orderNumber={booking.order_number} />
          <BookingWaitCountdown booking={booking} />
          <BookingProcessSection status={booking.status} checkedIn={checkedIn} />
        </div>
      );
    }

    if (booking.status === "accepted") {
      return (
        <BookingDetailSummary
          booking={booking}
          clientVisits={clientVisits}
          clientQuery={clientQuery}
          onChat={onChat}
        />
      );
    }

    if (booking.status === "in_progress") {
      if (step === 0) {
        return (
          <div className="space-y-4">
            <BookingServiceTimer booking={booking} className="w-full" />
            <BookingProcessSection status={booking.status} checkedIn={checkedIn} />
            <BookingOrderNumberBanner orderNumber={booking.order_number} />
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <BookingDetailSummary
            booking={booking}
            clientVisits={clientVisits}
            clientQuery={clientQuery}
            onChat={onChat}
          />
          <BookingNotesCard notes={booking.notes} />
          <BookingStatusHistory history={booking.status_history} />
          <BookingAddonHint onChat={onChat} />
        </div>
      );
    }

    if (booking.status === "completed") {
      if (step === 0) {
        return (
          <BookingDetailSummary
            booking={booking}
            clientVisits={clientVisits}
            clientQuery={clientQuery}
            onChat={onChat}
          />
        );
      }
      return (
        <div className="space-y-4">
          <BookingServiceTimer booking={booking} className="w-full" />
          <BookingResultPreview url={booking.result_image_url} />
          <BookingStatusHistory history={booking.status_history} />
        </div>
      );
    }

    return (
      <BookingDetailSummary
        booking={booking}
        clientVisits={clientVisits}
        clientQuery={clientQuery}
        onChat={onChat}
      />
    );
  }, [booking, bookingId, clientQuery, clientVisits, onChat, step]);

  return (
    <div
      className={
        wide
          ? "booking-detail-flow mx-auto w-full max-w-lg lg:max-w-4xl"
          : "booking-detail-flow mx-auto w-full max-w-lg"
      }
    >
      {!hideStepNav && steps.length > 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={entered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <BookingStepIndicator steps={steps} step={step} />
        </motion.div>
      ) : null}

      <div className={hideStepNav ? "min-h-0" : "mt-5 min-h-[min(380px,52vh)] sm:min-h-[440px]"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${booking.status}-${step}`}
            {...bookingFlowSlide}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {stepContent}
          </motion.div>
        </AnimatePresence>
      </div>

      {!hideStepNav && steps.length > 1 ? (
        <div
          className={
            hasActionBar
              ? "fixed inset-x-0 bottom-[4.75rem] z-20 border-t border-border bg-background/95 pb-2 pt-3 backdrop-blur-sm"
              : "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-sm"
          }
        >
          <div className="mx-auto flex max-w-lg items-stretch gap-2 px-4 lg:max-w-4xl">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Orqaga</span>
              </button>
            ) : (
              <Link
                to="/barber/bookings"
                className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Ro&apos;yxat</span>
              </Link>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background"
              >
                Davom etish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground"
              >
                Boshidan ko&apos;rish
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
