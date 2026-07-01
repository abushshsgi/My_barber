import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquare,
  Phone,
  Scissors,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CompleteBookingDialog } from "@/components/bookings/CompleteBookingDialog";
import {
  BookingNotesCard,
  BookingProcessSection,
  BookingServiceTimer,
  useLiveBookingTimer,
} from "@/components/bookings/BookingProcessParts";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { UserAvatar } from "@/components/barber/primitives";
import { formatUzPhoneDisplay, formatUzPhoneE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "chair", label: "Kresloda", short: "Seans", icon: Scissors },
  { id: "time", label: "Vaqt", short: "Vaqt", icon: Timer },
  { id: "finish", label: "Yakunlash", short: "Tugatish", icon: CheckCircle2 },
] as const;

const slide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

type Props = {
  booking: Booking;
  bookingId: string;
  busy?: boolean;
  initialStep?: number;
  autoOpenComplete?: boolean;
  onChat?: () => void;
  onComplete: (options: import("@/lib/map-booking").CompleteBookingOptions) => void;
};

function SessionStepIndicator({ step }: { step: number }) {
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted sm:h-1.5">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {STEPS.map((meta, i) => {
          const Icon = meta.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={meta.id} className="flex items-center gap-1 sm:gap-2">
              {i > 0 ? (
                <div className="hidden h-px w-3 bg-border sm:block sm:w-5" aria-hidden />
              ) : null}
              <motion.div
                initial={false}
                animate={{ scale: active ? 1.03 : 1 }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-[11px]",
                  done && "border-foreground bg-foreground text-background",
                  active && !done && "border-foreground bg-background text-foreground shadow-card",
                  !done && !active && "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                <span className="grid size-4 place-items-center sm:size-5">
                  {done ? (
                    <Check className="size-3 sm:size-3.5" />
                  ) : (
                    <Icon className="size-3 sm:size-3.5" />
                  )}
                </span>
                <span className="hidden sm:inline">{meta.short}</span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InChairHero({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-foreground px-5 py-6 text-background">
      <div className="relative grid size-16 place-items-center">
        {active ? (
          <>
            <motion.span
              className="absolute inset-0 rounded-full bg-background/20"
              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute inset-0 rounded-full bg-background/20"
              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.85 }}
            />
          </>
        ) : null}
        <span className="relative grid size-12 place-items-center rounded-full bg-background text-foreground">
          <Scissors className="size-5" />
        </span>
      </div>
      <div className="text-center">
        <p className="font-heading text-lg font-semibold">Mijoz kresloda</p>
        <p className="mt-0.5 text-xs text-background/70">Xizmat davom etmoqda</p>
      </div>
    </div>
  );
}

function SessionChairStep({
  booking,
  onChat,
}: {
  booking: Booking;
  onChat?: () => void;
}) {
  const phone = booking.client_phone?.trim();
  const phoneE164 = phone ? formatUzPhoneE164(phone) : null;

  return (
    <div className="space-y-4">
      <InChairHero active={booking.status === "in_progress"} />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex items-start gap-3">
          <UserAvatar src={booking.client_avatar} name={booking.client} className="size-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-base font-semibold">{booking.client}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{booking.service}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {booking.date} · <span className="tabular-nums">{booking.time}</span> · {booking.duration_min} daq
            </p>
          </div>
          <p className="shrink-0 font-heading text-base font-semibold tabular-nums">{formatUZS(booking.price)}</p>
        </div>

        {phoneE164 ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <a
              href={`tel:${phoneE164}`}
              className="inline-flex flex-1 min-w-[calc(50%-0.25rem)] items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium sm:flex-none sm:min-w-0"
            >
              <Phone className="size-3.5" />
              Qo&apos;ng&apos;iroq
            </a>
            <a
              href={`sms:${phoneE164}`}
              className="inline-flex flex-1 min-w-[calc(50%-0.25rem)] items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-xs font-medium sm:flex-none sm:min-w-0"
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
    </div>
  );
}

function SessionTimeStep({ booking }: { booking: Booking }) {
  return (
    <div className="space-y-4">
      <BookingServiceTimer booking={booking} className="w-full" />
      <BookingProcessSection status={booking.status} checkedIn={!!booking.checked_in_at} />
      <BookingNotesCard notes={booking.notes} />
    </div>
  );
}

function SessionFinishStep({ booking }: { booking: Booking }) {
  const timer = useLiveBookingTimer(booking);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card text-center sm:p-6">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted">
          <CheckCircle2 className="size-7 text-foreground" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">Xizmatni yakunlash</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.client} · {booking.service}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium tabular-nums">
          <Clock3 className="size-4 text-muted-foreground" />
          {timer.elapsedLabel} davom etdi
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Tugatish tugmasini bosganda natija rasmi va portfolio ruxsatini tasdiqlaysiz.
        </p>
      </div>
    </div>
  );
}

export function BookingSessionFlow({
  booking,
  bookingId,
  busy,
  initialStep = 0,
  autoOpenComplete = false,
  onChat,
  onComplete,
}: Props) {
  const [step, setStep] = useState(() => Math.min(Math.max(initialStep, 0), STEPS.length - 1));
  const [completeOpen, setCompleteOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (autoOpenComplete && step === STEPS.length - 1) {
      const id = window.setTimeout(() => setCompleteOpen(true), 450);
      return () => window.clearTimeout(id);
    }
  }, [autoOpenComplete, step]);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="booking-session-flow mx-auto w-full max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={entered ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <SessionStepIndicator step={step} />
      </motion.div>

      <div className="mt-5 min-h-[min(420px,55vh)] sm:min-h-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            {...slide}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 ? <SessionChairStep booking={booking} onChat={onChat} /> : null}
            {step === 1 ? <SessionTimeStep booking={booking} /> : null}
            {step === 2 ? <SessionFinishStep booking={booking} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-stretch gap-2 px-4">
          {!isFirst ? (
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
              to="/barber/bookings/$bookingId"
              params={{ bookingId }}
              className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </Link>
          )}

          {isLast ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setCompleteOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Xizmatni tugatish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background"
            >
              Keyingi
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      <CompleteBookingDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        booking={booking}
        busy={busy}
        onConfirm={(opts) => onComplete(opts)}
      />
    </div>
  );
}
