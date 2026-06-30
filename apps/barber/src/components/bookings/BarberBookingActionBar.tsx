import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Loader2,
  Play,
  ScanLine,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import { cn } from "@/lib/utils";

type Props = {
  booking: Booking;
  bookingId: string;
  busy?: boolean;
  onReject?: () => void;
  onAccept?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  maxWidthClass?: string;
};

export function BarberBookingActionBar({
  booking,
  bookingId,
  busy,
  onReject,
  onAccept,
  onStart,
  onComplete,
  maxWidthClass = "max-w-[1300px]",
}: Props) {
  if (["completed", "cancelled", "rejected"].includes(booking.status)) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-4px_24px_rgba(41,38,36,0.06)]">
      <div className={cn("mx-auto flex items-stretch gap-2 px-4", maxWidthClass)}>
        {busy ? (
          <ActionBarLoading />
        ) : (
          <ActionBarContent
            booking={booking}
            bookingId={bookingId}
            onReject={onReject}
            onAccept={onAccept}
            onStart={onStart}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

function ActionBarLoading() {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Bajarilmoqda…
    </div>
  );
}

function ActionBarContent({
  booking,
  bookingId,
  onReject,
  onAccept,
  onStart,
  onComplete,
}: Omit<Props, "busy" | "maxWidthClass">) {
  if (booking.status === "pending") {
    return (
      <>
        <GhostAction label="Rad etish" icon={<X className="size-4" />} onClick={onReject} />
        <PrimaryAction
          label="Qabul qilish"
          icon={<CheckCircle2 className="size-4" />}
          onClick={onAccept}
          className="flex-[1.6]"
        />
      </>
    );
  }

  if (booking.status === "accepted") {
    if (booking.checked_in_at) {
      return (
        <PrimaryAction
          label="Xizmatni boshlash"
          icon={<Play className="size-4" />}
          onClick={onStart}
        />
      );
    }
    return (
      <PrimaryLink
        to="/barber/bookings/$bookingId/check-in"
        params={{ bookingId }}
        label="Mijozni qabul qilish"
        icon={<ScanLine className="size-4" />}
      />
    );
  }

  if (booking.status === "in_progress") {
    return (
      <PrimaryAction
        label="Xizmatni tugatish"
        icon={<CheckCircle2 className="size-4" />}
        onClick={onComplete}
      />
    );
  }

  return null;
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

function PrimaryLink({
  to,
  params,
  label,
  icon,
}: {
  to: string;
  params: { bookingId: string };
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      params={params}
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
    >
      {icon}
      {label}
    </Link>
  );
}
