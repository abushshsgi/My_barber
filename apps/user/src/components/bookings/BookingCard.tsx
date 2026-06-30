import { Link } from "@tanstack/react-router";
import { CalendarPlus, ChevronRight, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getCustomerCancelPolicy, formatCancelCountdown } from "@mybarber/shared/booking-lifecycle";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { WriteReviewDialog } from "@/components/bookings/WriteReviewDialog";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
import { useCancelBooking } from "@/hooks/use-bookings-api";
import { formatPrice, type BookingItem } from "@/lib/mock-data";
import { bookingLifecycleStatus } from "@/lib/bookings-utils";
import { cn } from "@/lib/utils";

export function BookingsEmptyState() {
  const { t } = useTranslation();

  return (
    <PageSpotlightEmpty
      icon={CalendarPlus}
      tone="warm"
      title={t("bookings.emptyTitle", { defaultValue: "Hali bron yo'q" })}
      description={t("bookings.emptyHint", {
        defaultValue: "Yaqin atrofdagi salonlardan vaqtni tanlab, birinchi broningizni qiling.",
      })}
      action={
        <Link
          to="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98] hover:opacity-95 sm:w-auto"
        >
          <CalendarPlus className="h-4 w-4" />
          {t("bookings.browseSalons", { defaultValue: "Bron qilish" })}
        </Link>
      }
    />
  );
}

const statusStyles: Record<BookingItem["status"], string> = {
  pending: "bg-amber-100 text-amber-900",
  accepted: "bg-foreground text-background",
  in_progress: "bg-emerald-600 text-white",
  done: "border border-border bg-surface text-muted-foreground",
  cancelled: "border border-border bg-surface text-muted-foreground line-through",
};

export function BookingCard({ booking: b, focused }: { booking: BookingItem; focused?: boolean }) {
  const { t } = useTranslation();
  const [reviewOpen, setReviewOpen] = useState(false);
  const cancelMut = useCancelBooking();
  const d = new Date(b.date);
  const dateStr = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

  const cancelPolicy = getCustomerCancelPolicy({
    createdAt: b.createdAt ?? b.date,
    status: bookingLifecycleStatus(b),
  });
  const canCancel =
    (b.status === "pending" || b.status === "accepted") && cancelPolicy.allowed;

  const onCancel = () => {
    if (!cancelPolicy.allowed) {
      toast.error(cancelPolicy.reason ?? "Bekor qilish mumkin emas");
      return;
    }
    cancelMut.mutate(b.id, {
      onSuccess: () =>
        toast.success(t("bookings.cancelled", { defaultValue: "Bron bekor qilindi" })),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <article
      id={`booking-${b.id}`}
      className={cn(
        "overflow-hidden rounded-[24px] border border-border bg-background shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]",
        focused && "ring-2 ring-foreground",
        b.status === "in_progress" && "ring-1 ring-emerald-500/30",
      )}
    >
      <Link
        to="/bookings/$bookingId"
        params={{ bookingId: b.id }}
        className="group block"
      >
        <div className="flex items-stretch gap-0">
          <div
            className="w-24 shrink-0 sm:w-28"
            style={{
              background: `linear-gradient(160deg, oklch(0.88 0.04 ${(Number(b.salonId) * 80) % 360}), oklch(0.42 0.07 ${(Number(b.salonId) * 80 + 40) % 360}))`,
            }}
          />
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold">{b.salonName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {b.serviceName} · {b.barberName}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    statusStyles[b.status],
                  )}
                >
                  {t(`bookings.status.${b.status}`)}
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>

            {b.bookedForName ? (
              <p className="mt-2 text-xs font-semibold text-foreground">
                {t("family.bookFor", { name: b.bookedForName, defaultValue: "{{name}} uchun" })}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-bold">{dateStr}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-bold tabular-nums">{timeStr}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-bold tabular-nums">{formatPrice(b.price)}</span>
            </div>

            {b.orderNumber ? (
              <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {b.orderNumber}
              </p>
            ) : null}

            {b.status === "pending" || b.status === "accepted" ? (
              cancelPolicy.allowed && cancelPolicy.secondsUntilCutoff != null ? (
                <p className="mt-3 text-xs font-semibold text-foreground">
                  Bekor qilish: {formatCancelCountdown(cancelPolicy.secondsUntilCutoff)}
                  {b.status === "accepted" ? " (tasdiqlangan)" : ""}
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Bekor qilish muddati tugadi</p>
              )
            ) : null}

            {b.status === "in_progress" ? (
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Xizmat davom etmoqda — taymerni ko'rish
              </p>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex gap-2 border-t border-border bg-surface/40 p-3 sm:px-5">
        {b.status === "done" ? (
          b.hasReview && b.reviewId ? (
            <Link
              to="/reviews"
              search={{ focus: b.reviewId }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-muted-foreground"
            >
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />{" "}
              {t("bookings.alreadyReviewed", { defaultValue: "Sharh qoldirilgan" })}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-background py-2.5 text-xs font-bold shadow-sm"
              >
                <Star className="h-3.5 w-3.5" /> {t("bookings.writeReview")}
              </button>
              <WriteReviewDialog
                open={reviewOpen}
                onOpenChange={setReviewOpen}
                booking={{
                  id: b.id,
                  salonName: b.salonName,
                  serviceName: b.serviceName,
                  barberName: b.barberName,
                }}
              />
            </>
          )
        ) : (
          <BookingChatButton barberId={b.barberId} />
        )}
        {canCancel ? (
          <button
            type="button"
            disabled={cancelMut.isPending}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-background py-2.5 text-xs font-semibold disabled:opacity-60"
          >
            {cancelMut.isPending ? "…" : t("common.cancel")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
