import { CheckCircle2, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import { BookingFlowActionRail } from "@/components/bookings/BookingFlowActionRail";
import { cn } from "@/lib/utils";

type Props = {
  booking: Booking;
  bookingId: string;
  busy?: boolean;
  onReject?: () => void;
  onAccept?: () => void;
  maxWidthClass?: string;
  variant?: "fixed" | "inline";
};

/** Faqat kutilayotgan bron uchun — qabul / rad etish. */
export function BarberBookingActionBar({
  booking,
  busy,
  onReject,
  onAccept,
  maxWidthClass = "max-w-[1300px]",
  variant = "fixed",
}: Props) {
  if (booking.status !== "pending") {
    return null;
  }

  const content = (
    <>
      <GhostAction
        label="Rad etish"
        icon={<X className="size-4" />}
        onClick={onReject}
        disabled={busy}
      />
      <PrimaryAction
        label="Qabul qilish"
        icon={busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        onClick={onAccept}
        disabled={busy}
        className="flex-[1.6]"
      />
    </>
  );

  if (variant === "inline") {
    return (
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <p className="mb-3 text-sm font-medium text-foreground">Javob bering</p>
        <div className="flex items-stretch gap-2">{content}</div>
      </div>
    );
  }

  return (
    <BookingFlowActionRail maxWidthClass={maxWidthClass}>{content}</BookingFlowActionRail>
  );
}

function GhostAction({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
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
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
