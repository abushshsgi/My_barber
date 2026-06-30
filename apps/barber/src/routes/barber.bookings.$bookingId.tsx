import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Phone,
  Play,
  ScanLine,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseCheckInQrPayload } from "@mybarber/shared/booking-lifecycle";
import { CheckInScanner } from "@/components/bookings/CheckInScanner";
import { CompleteBookingDialog } from "@/components/bookings/CompleteBookingDialog";
import {
  BookingAddonHint,
  BookingDetailSummary,
  BookingFamilyBanner,
  BookingLifecycleTimeline,
  BookingLocationCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
  BookingResultPreview,
  BookingServiceTimer,
  BookingStatusHero,
  BookingStatusHistory,
  BookingWaitCountdown,
} from "@/components/bookings/BookingProcessParts";
import { useBookingLiveSync } from "@/hooks/use-booking-live-sync";
import {
  useBarberBookingQuery,
  useBookingActionMutation,
  useCheckInByTokenMutation,
} from "@/hooks/use-barber-queries";
import type { Booking } from "@/components/barber/BarberContext";
import type { CompleteBookingOptions } from "@/lib/map-booking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/bookings/$bookingId")({
  component: BarberBookingProcessPage,
});

function BarberBookingProcessPage() {
  const navigate = useNavigate();
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading, isError, error } = useBarberBookingQuery(bookingId);
  const actionMut = useBookingActionMutation();
  const [completeOpen, setCompleteOpen] = useState(false);
  useBookingLiveSync(bookingId);
  const busy = actionMut.isPending;

  const runAction = (
    action: "accept" | "reject" | "cancel" | "start",
    opts?: { onSuccess?: () => void },
  ) => {
    actionMut.mutate(
      { id: bookingId, action },
      {
        onSuccess: () => {
          if (action === "accept") toast.success("Bron qabul qilindi");
          if (action === "start") toast.success("Xizmat boshlandi");
          if (action === "cancel" || action === "reject") toast.success("Bron bekor qilindi");
          opts?.onSuccess?.();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onComplete = (options: CompleteBookingOptions) => {
    actionMut.mutate(
      { id: bookingId, action: "complete", completeOptions: options },
      {
        onSuccess: () => {
          toast.success("Xizmat yakunlandi");
          setCompleteOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 p-4 pb-28 sm:p-6 lg:p-8">
      <Link
        to="/barber/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Barcha bronlar
      </Link>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl bg-card shadow-card">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {(error as Error).message || "Bron yuklanmadi"}
        </div>
      ) : booking ? (
        <>
          <BookingFamilyBanner name={booking.booked_for_name} />
          <BookingStatusHero booking={booking} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-5">
            <div className="space-y-4">
              <BookingDetailSummary booking={booking} />

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.35 }}
                className="rounded-2xl bg-card p-4 shadow-card sm:p-5"
              >
                <h2 className="mb-4 font-heading text-base font-semibold">Jarayon</h2>
                <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checked_in_at} />
              </motion.div>

              {booking.status === "accepted" && !booking.checked_in_at ? (
                <BarberManualCheckInCard booking={booking} />
              ) : null}

              <BookingStatusHistory history={booking.status_history} />
              <BookingResultPreview url={booking.result_image_url} />

              {booking.status === "in_progress" ? (
                <BookingAddonHint onChat={() => void navigate({ to: "/barber/chat" })} />
              ) : null}

              <BookingLocationCard booking={booking} />

              {booking.client_phone ? (
                <motion.a
                  href={`tel:${booking.client_phone}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 text-sm font-medium shadow-card transition-colors hover:bg-muted"
                >
                  <Phone className="size-4" />
                  {booking.client_phone}
                </motion.a>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20">
              <BookingWaitCountdown booking={booking} />
              <BookingServiceTimer booking={booking} />
              <BookingOrderNumberBanner orderNumber={booking.order_number} />
              <BookingPaymentCard booking={booking} />
            </aside>
          </div>

          <CompleteBookingDialog
            open={completeOpen}
            onOpenChange={setCompleteOpen}
            booking={booking}
            busy={busy}
            onConfirm={onComplete}
          />
        </>
      ) : null}

      {booking && !["completed", "cancelled", "rejected"].includes(booking.status) ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-[1300px] flex-wrap items-center gap-2">
            {busy ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Bajarilmoqda…
              </div>
            ) : (
              <>
                {booking.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => runAction("reject")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" />
                      Rad etish
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction("accept")}
                      className="inline-flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <CheckCircle2 className="size-4" />
                      Qabul qilish
                    </button>
                  </>
                ) : null}
                {booking.status === "accepted" ? (
                  booking.checked_in_at ? (
                    <button
                      type="button"
                      onClick={() => runAction("start")}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      <Play className="size-4" />
                      Boshlash
                    </button>
                  ) : (
                    <div
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-center text-xs font-medium text-muted-foreground"
                      title="Avval mijoz QR yoki kodini tasdiqlang"
                    >
                      <ScanLine className="size-4 shrink-0" />
                      Boshlash uchun QR/kodni tasdiqlang
                    </div>
                  )
                ) : null}
                {booking.status === "in_progress" ? (
                  <button
                    type="button"
                    onClick={() => setCompleteOpen(true)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                  >
                    <CheckCircle2 className="size-4" />
                    Tugatish
                  </button>
                ) : null}
                {(booking.status === "pending" || booking.status === "accepted") && (
                  <button
                    type="button"
                    onClick={() => runAction("cancel")}
                    className={cn(
                      "inline-flex items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted",
                      booking.status === "accepted" && "flex-1",
                    )}
                  >
                    Bekor
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BarberManualCheckInCard({ booking: _booking }: { booking: Booking }) {
  const [code, setCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const checkInMut = useCheckInByTokenMutation();

  const runCheckIn = (payload: { token?: string; short_code?: string }) => {
    checkInMut.mutate(payload, {
      onSuccess: () => {
        toast.success("Mijoz qabul qilindi");
        setCode("");
        setScannerOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const submit = () => {
    const raw = code.trim();
    if (!raw) {
      toast.error("Mijoz kodini kiriting");
      return;
    }
    const token = parseCheckInQrPayload(raw);
    runCheckIn(token && token.length > 12 ? { token } : { short_code: raw.toUpperCase() });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.35 }}
      className="rounded-2xl bg-gradient-to-br from-sky-500/10 to-card p-4 shadow-card sm:p-5"
    >
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-semibold">
        <span className="grid size-8 place-items-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
          <ScanLine className="size-4" />
        </span>
        Mijozni qabul qilish
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Mijoz ilovasidagi QR yoki bir martalik kodni kiriting. Kod bir marta ishlatiladi.
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Masalan: 7F3A9K"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm font-semibold uppercase tracking-[0.2em] outline-none transition-colors focus:border-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={checkInMut.isPending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {checkInMut.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserCheck className="size-4" />
          )}
          Qabul
        </button>
      </div>
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        disabled={checkInMut.isPending}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        <ScanLine className="size-4" />
        QR kodni skaner qilish
      </button>

      <CheckInScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(token) => runCheckIn({ token })}
      />
    </motion.div>
  );
}
