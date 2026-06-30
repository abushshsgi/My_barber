import { useEffect, useState } from "react";
import {
  BOOKING_PENDING_RESPONSE_MINUTES,
  formatCancelCountdown,
  getPendingBarberResponsePolicy,
} from "@mybarber/shared/booking-lifecycle";
import { AlertCircle, Clock3 } from "lucide-react";
import type { Booking } from "@/components/barber/BarberContext";
import { cn } from "@/lib/utils";

export function useLivePendingBarberResponse(booking: Pick<Booking, "status" | "created_at"> | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!booking || booking.status !== "pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking?.status, booking?.created_at]);

  if (!booking?.created_at) {
    return getPendingBarberResponsePolicy({
      createdAt: new Date().toISOString(),
      status: "pending",
      now,
    });
  }

  return getPendingBarberResponsePolicy({
    createdAt: booking.created_at,
    status: "pending",
    now,
  });
}

export function BarberPendingResponseBanner({
  booking,
  className,
}: {
  booking: Booking;
  className?: string;
}) {
  const policy = useLivePendingBarberResponse(booking);

  if (booking.status !== "pending" || !policy.awaitingBarber) return null;

  if (policy.expired) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 stroke-[1.5]" />
          <div>
            <p className="font-medium text-foreground">Muddat tugadi</p>
            <p className="mt-1 text-xs leading-relaxed">
              {policy.reason ?? "Bron avtomatik bekor qilinadi."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-foreground/15 bg-foreground px-4 py-3 text-background",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Clock3 className="mt-0.5 size-4 shrink-0 stroke-[1.5]" />
        <div>
          <p className="text-sm font-semibold">
            Qabul qilish: {formatCancelCountdown(policy.secondsUntilExpiry ?? 0)} qoldi
          </p>
          <p className="mt-1 text-xs text-background/75">
            {BOOKING_PENDING_RESPONSE_MINUTES} daqiqa ichida qabul qilmang — bron avtomatik bekor
            qilinadi.
          </p>
        </div>
      </div>
    </div>
  );
}
