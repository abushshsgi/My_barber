import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  BookingDetailSummary,
  BookingNotesCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
  BookingResultPreview,
  BookingServiceTimer,
  BookingStatusHistory,
} from "@/components/bookings/BookingProcessParts";
import type { Booking } from "@/components/barber/BarberContext";

type Props = {
  booking: Booking;
  clientVisits?: number;
  clientQuery?: string;
  onChat?: () => void;
  wide?: boolean;
};

/** Yakunlangan / bekor / rad etilgan bron — faqat ko'rish, QR va bosqichlar yo'q. */
export function BookingCompletedSummary({
  booking,
  clientVisits,
  clientQuery,
  onChat,
  wide = false,
}: Props) {
  const isDone = booking.status === "completed";

  return (
    <div className={wide ? "mx-auto w-full max-w-4xl space-y-4" : "mx-auto w-full max-w-lg space-y-4"}>
      <BookingDetailSummary
        booking={booking}
        clientVisits={clientVisits}
        clientQuery={clientQuery}
        onChat={onChat}
      />
      {isDone ? (
        <>
          <BookingServiceTimer booking={booking} className="w-full" />
          {booking.result_image_url ? (
            <BookingResultPreview url={booking.result_image_url} />
          ) : null}
        </>
      ) : null}
      <BookingNotesCard notes={booking.notes} />
      <BookingPaymentCard booking={booking} />
      <BookingOrderNumberBanner orderNumber={booking.order_number} />
      {booking.status_history?.length ? (
        <BookingStatusHistory history={booking.status_history} />
      ) : null}

      <div className="pt-2">
        <Link
          to="/barber/bookings"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Bronlar tarixiga qaytish
        </Link>
      </div>
    </div>
  );
}
