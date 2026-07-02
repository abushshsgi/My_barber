import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Phone,
  Scissors,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CompleteBookingSheet } from "@/components/bookings/CompleteBookingSheet";
import {
  BookingNotesCard,
  BookingProcessSection,
  BookingServiceTimer,
} from "@/components/bookings/BookingProcessParts";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { UserAvatar } from "@/components/barber/primitives";
import { formatUzPhoneE164 } from "@/lib/phone";

type Props = {
  booking: Booking;
  bookingId: string;
  busy?: boolean;
  autoOpenComplete?: boolean;
  completeSuccess?: boolean;
  onChat?: () => void;
  onComplete: (options: import("@/lib/map-booking").CompleteBookingOptions) => void;
  wide?: boolean;
};

function InChairHero({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-foreground px-5 py-5 text-background sm:py-6">
      <div className="relative grid size-14 place-items-center sm:size-16">
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
        <span className="relative grid size-11 place-items-center rounded-full bg-background text-foreground sm:size-12">
          <Scissors className="size-5" />
        </span>
      </div>
      <div className="text-center">
        <p className="font-heading text-lg font-semibold">Xizmat davom etmoqda</p>
        <p className="mt-0.5 text-xs text-background/70">Mijoz kresloda</p>
      </div>
    </div>
  );
}

export function BookingSessionFlow({
  booking,
  bookingId,
  busy,
  autoOpenComplete = false,
  completeSuccess = false,
  onChat,
  onComplete,
  wide = false,
}: Props) {
  const [completeOpen, setCompleteOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  const phone = booking.client_phone?.trim();
  const phoneE164 = phone ? formatUzPhoneE164(phone) : null;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (autoOpenComplete) {
      const id = window.setTimeout(() => setCompleteOpen(true), 450);
      return () => window.clearTimeout(id);
    }
  }, [autoOpenComplete]);

  useEffect(() => {
    if (completeSuccess) setCompleteOpen(true);
  }, [completeSuccess]);

  return (
    <div
      className={
        wide
          ? "booking-session-flow mx-auto w-full max-w-lg lg:max-w-4xl"
          : "booking-session-flow mx-auto w-full max-w-lg"
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={entered ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6"
      >
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
              <p className="shrink-0 font-heading text-base font-semibold tabular-nums">
                {formatUZS(booking.price)}
              </p>
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

        <div className="mt-4 space-y-4 lg:mt-0">
          <BookingServiceTimer booking={booking} className="w-full" />
          <BookingProcessSection status={booking.status} checkedIn={!!booking.checked_in_at} />
          <BookingNotesCard notes={booking.notes} />
        </div>
      </motion.div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-sm">
        <div
          className={
            wide
              ? "mx-auto flex max-w-lg items-stretch gap-2 px-4 lg:max-w-4xl"
              : "mx-auto flex max-w-lg items-stretch gap-2 px-4"
          }
        >
          <Link
            to="/barber/bookings"
            className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground"
          >
            Chiqish
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => setCompleteOpen(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Xizmatni tugatish
          </button>
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
