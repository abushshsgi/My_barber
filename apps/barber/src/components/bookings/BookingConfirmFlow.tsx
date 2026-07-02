import { motion } from "framer-motion";
import { BadgeCheck, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { useEffect, useRef } from "react";
import { BarberManualCheckInCard } from "@/components/bookings/BookingCheckInCard";
import {
  BookingDetailSummary,
  BookingLocationCard,
  BookingNotesCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
} from "@/components/bookings/BookingProcessParts";
import type { Booking } from "@/components/barber/BarberContext";

type Props = {
  booking: Booking;
  bookingId: string;
  clientVisits?: number;
  clientQuery?: string;
  busy?: boolean;
  onChat?: () => void;
  onStart: () => void;
};

export function BookingConfirmFlow({
  booking,
  bookingId,
  clientVisits,
  clientQuery,
  busy,
  onChat,
  onStart,
}: Props) {
  const checkedIn = !!booking.checked_in_at;
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!checkedIn || autoStartedRef.current || busy) return;
    if (booking.status !== "accepted") return;
    autoStartedRef.current = true;
    onStart();
  }, [checkedIn, booking.status, busy, onStart]);

  return (
    <div className="booking-confirm-flow mx-auto w-full max-w-lg lg:max-w-none">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-5 flex items-center gap-3 rounded-2xl border border-foreground/15 bg-foreground px-4 py-3.5 text-background"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-background/15">
          <BadgeCheck className="size-5" />
        </span>
        <div>
          <p className="font-heading text-sm font-semibold">Bron tasdiqlash</p>
          <p className="text-xs text-background/75">
            Ma&apos;lumotlarni tekshiring, mijozni qabul qiling va xizmatni boshlang.
          </p>
        </div>
      </motion.div>

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="space-y-4">
          <BookingDetailSummary
            booking={booking}
            clientVisits={clientVisits}
            clientQuery={clientQuery}
            onChat={onChat}
          />
          <BookingNotesCard notes={booking.notes} />
          <BookingLocationCard booking={booking} />
          <BookingPaymentCard booking={booking} />
          <BookingOrderNumberBanner orderNumber={booking.order_number} />
        </div>

        <div className="space-y-4">
          {checkedIn ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-card p-5 shadow-card text-center"
            >
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-foreground text-background">
                {busy ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-6" />
                )}
              </div>
              <h2 className="mt-4 font-heading text-lg font-semibold">Mijoz qabul qilindi</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Xizmat boshlanmoqda, taymer ochiladi…
              </p>
            </motion.div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <ScanLine className="size-4" />
                  Mijozni tasdiqlash
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  QR yoki 6 xonali kodni skaner qiling — keyin xizmat avtomatik boshlanadi.
                </p>
              </div>
              <BarberManualCheckInCard />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
