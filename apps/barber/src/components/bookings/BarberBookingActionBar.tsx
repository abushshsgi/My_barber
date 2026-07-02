import { CheckCircle2, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import { cn } from "@/lib/utils";

type Props = {
  booking: Booking;
  bookingId: string;
  busy?: boolean;
  onReject?: () => void;
  onAccept?: () => void;
  maxWidthClass?: string;
};

/** Faqat kutilayotgan bron uchun — qabul / rad etish. */
export function BarberBookingActionBar({
  booking,
  busy,
  onReject,
  onAccept,
  maxWidthClass = "max-w-[1300px]",
}: Props) {
  if (booking.status !== "pending") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-4px_24px_rgba(41,38,36,0.06)]">
      <div className={cn("mx-auto flex items-stretch gap-2 px-4", maxWidthClass)}>
        {busy ? (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Qabul qilinmoqda…
          </div>
        ) : (
          <>
            <GhostAction label="Rad etish" icon={<X className="size-4" />} onClick={onReject} />
            <PrimaryAction
              label="Qabul qilish"
              icon={<CheckCircle2 className="size-4" />}
              onClick={onAccept}
              className="flex-[1.6]"
            />
          </>
        )}
      </div>
    </div>
  );
}

function GhostAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {icon}
      {label}
    </button>
  );
}

function PrimaryAction({
  label,
  icon,
  onClick,
  className,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 active:opacity-80",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
