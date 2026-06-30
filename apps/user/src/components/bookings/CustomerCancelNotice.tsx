import { useEffect, useState } from "react";
import {
  BOOKING_CANCEL_WINDOW_MINUTES,
  formatCancelCountdown,
  getCustomerCancelPolicy,
} from "@mybarber/shared/booking-lifecycle";
import { AlertCircle, Clock3 } from "lucide-react";
import type { BookingItem } from "@/lib/mock-data";
import { bookingLifecycleStatus } from "@/lib/bookings-utils";
import { cn } from "@/lib/utils";

export function useLiveCustomerCancelPolicy(booking: Pick<BookingItem, "status" | "createdAt"> | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!booking || booking.status !== "pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking?.status, booking?.createdAt]);

  if (!booking?.createdAt) {
    return getCustomerCancelPolicy({
      createdAt: new Date().toISOString(),
      status: booking ? bookingLifecycleStatus(booking) : "pending",
      now,
    });
  }

  return getCustomerCancelPolicy({
    createdAt: booking.createdAt,
    status: bookingLifecycleStatus(booking),
    now,
  });
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
  const policy = useLiveCustomerCancelPolicy(booking);

  if (booking.status === "cancelled" || booking.status === "done") return null;

  if (booking.status === "accepted") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <p className="font-medium text-foreground">Bron tasdiqlandi</p>
        <p className="mt-1 text-xs leading-relaxed">
          Endi bekor qilib bo&apos;lmaydi. O&apos;zgarish kerak bo&apos;lsa sartarosh bilan chatda
          yozing.
        </p>
      </div>
    );
  }

  if (booking.status !== "pending") return null;

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
            <p className={cn("mt-1 text-background/75", variant === "compact" ? "text-[11px]" : "text-xs")}>
              Faqat buyurtmadan keyin {BOOKING_CANCEL_WINDOW_MINUTES} daqiqa va faqat sartarosh qabul
              qilmasdan oldin. Keyin bekor qilish mumkin emas.
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
