import { useEffect, useState } from "react";
import {
  BOOKING_CANCEL_WINDOW_MINUTES,
  BOOKING_PENDING_RESPONSE_MINUTES,
  formatCancelCountdown,
  getCustomerCancelPolicy,
  getPendingBarberResponsePolicy,
} from "@mybarber/shared/booking-lifecycle";
import { AlertCircle, Clock3 } from "lucide-react";
import type { BookingItem } from "@/lib/mock-data";
import { bookingLifecycleStatus } from "@/lib/bookings-utils";
import { cn } from "@/lib/utils";

export function useLiveCustomerCancelPolicy(booking: Pick<BookingItem, "status" | "createdAt"> | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!booking || (booking.status !== "pending" && booking.status !== "accepted")) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking?.status, booking?.createdAt]);

  const createdAt = booking?.createdAt ?? new Date().toISOString();
  const status = booking ? bookingLifecycleStatus(booking) : "pending";

  return {
    cancel: getCustomerCancelPolicy({ createdAt, status, now }),
    barberResponse:
      booking?.status === "pending"
        ? getPendingBarberResponsePolicy({ createdAt, status: "pending", now })
        : null,
  };
}

export function CustomerCancelNotice({
  booking,
  variant = "banner",
  className,
}: {
  booking: BookingItem;
  variant?: "banner" | "compact";
  className?: string;
}) {
  const { cancel: policy, barberResponse: barberPolicy } = useLiveCustomerCancelPolicy(booking);

  if (booking.status === "cancelled" || booking.status === "done") return null;
  if (booking.status !== "pending" && booking.status !== "accepted") return null;

  if (booking.status === "pending" && barberPolicy?.expired) {
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
            <p className="font-medium text-foreground">Sartarosh javob bermadi</p>
            <p className="mt-1 text-xs leading-relaxed">
              {barberPolicy.reason ?? "Bron avtomatik bekor qilinadi."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (policy.allowed && policy.secondsUntilCutoff != null) {
    return (
      <div
        className={cn(
          "rounded-xl border border-foreground/15 bg-foreground px-4 py-3 text-background",
          variant === "compact" && "px-3 py-2",
          className,
        )}
      >
        <div className="flex items-start gap-2.5">
          <Clock3 className="mt-0.5 size-4 shrink-0 stroke-[1.5]" />
          <div className="min-w-0">
            <p className={cn("font-semibold", variant === "compact" ? "text-xs" : "text-sm")}>
              Bekor qilish: {formatCancelCountdown(policy.secondsUntilCutoff)} qoldi
            </p>
            {barberPolicy?.secondsUntilExpiry != null && booking.status === "pending" ? (
              <p className={cn("mt-1 font-medium text-background/90", variant === "compact" ? "text-[11px]" : "text-xs")}>
                Sartarosh javobi: {formatCancelCountdown(barberPolicy.secondsUntilExpiry)} qoldi
              </p>
            ) : null}
            <p className={cn("mt-1 text-background/75", variant === "compact" ? "text-[11px]" : "text-xs")}>
              Buyurtmadan keyin {BOOKING_CANCEL_WINDOW_MINUTES} daqiqa ichida bekor qilish mumkin.
              {booking.status === "accepted"
                ? " Sartarosh qabul qildi — taymer tugaguncha bekor qila olasiz."
                : ` Sartarosh ham ${BOOKING_PENDING_RESPONSE_MINUTES} daqiqa ichida javob berishi kerak, aks holda bron yopiladi.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="font-medium text-foreground">Bekor qilish yopildi</p>
          <p className="mt-1 text-xs leading-relaxed">{policy.reason}</p>
        </div>
      </div>
    </div>
  );
}
