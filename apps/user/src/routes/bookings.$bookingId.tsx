import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { playBookingCompletionChime, formatCancelCountdown } from "@mybarber/shared/booking-lifecycle";
import { PostCompletionSurvey } from "@/components/bookings/PostCompletionSurvey";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { CustomerCancelNotice, useLiveCustomerCancelPolicy } from "@/components/bookings/CustomerCancelNotice";
import {
  BookingAddonHint,
  BookingDetailSummary,
  BookingLifecycleTimeline,
  BookingLocationCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
  BookingPortfolioConsent,
  BookingPortfolioUpload,
  BookingCheckInSection,
  BookingResultPreview,
  BookingServiceTimer,
  BookingStatusHistory,
  BookingWaitCountdown,
} from "@/components/bookings/BookingProcessParts";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-websocket";
import {
  useBooking,
  useCancelBooking,
  usePortfolioConsentMutation,
  usePortfolioPhotoMutation,
} from "@/hooks/use-bookings-api";

export const Route = createFileRoute("/bookings/$bookingId")({
  head: ({ params }) => ({
    meta: [{ title: `Bron #${params.bookingId} — mysaloon.uz` }],
  }),
  component: BookingProcessRoute,
});

function BookingProcessRoute() {
  return (
    <DesktopPageSplit mobile={<BookingProcessPage />} desktop={<BookingProcessPage wide />} />
  );
}

function BookingProcessPage({ wide }: { wide?: boolean }) {
  const { t } = useTranslation();
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading, isError, error } = useBooking(bookingId);
  const cancelMut = useCancelBooking();
  const consentMut = usePortfolioConsentMutation();
  const portfolioPhotoMut = usePortfolioPhotoMutation();
  const prevStatus = useRef<string | null>(null);
  const [surveyAutoOpen, setSurveyAutoOpen] = useState(false);
  useNotificationsWebSocket();

  useEffect(() => {
    if (!booking) return;
    if (prevStatus.current === "in_progress" && booking.status === "done") {
      playBookingCompletionChime();
      if (!booking.hasReview) setSurveyAutoOpen(true);
    }
    prevStatus.current = booking.status;
  }, [booking?.status, booking]);

  const cancelPolicies = useLiveCustomerCancelPolicy(booking ?? null);
  const cancelPolicy = cancelPolicies.cancel;

  const showCancel =
    booking &&
    (booking.status === "pending" || booking.status === "accepted") &&
    cancelPolicy.allowed;

  const onCancel = () => {
    if (!cancelPolicy.allowed) {
      toast.error(cancelPolicy.reason ?? "Bekor qilish mumkin emas");
      return;
    }
    cancelMut.mutate(bookingId, {
      onSuccess: () => toast.success(t("bookings.cancelled", { defaultValue: "Bron bekor qilindi" })),
      onError: (e) => toast.error(e.message),
    });
  };

  const onPortfolioConsent = (consent: boolean) => {
    consentMut.mutate(
      { id: bookingId, consent },
      {
        onSuccess: () =>
          toast.success(consent ? "Portfolio uchun ruxsat berildi" : "Portfolio rad etildi"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onPortfolioPhoto = (file: File) => {
    portfolioPhotoMut.mutate(
      { id: bookingId, file },
      {
        onSuccess: () => toast.success("Rasm yuklandi"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const showPortfolioConsent =
    booking &&
    (booking.status === "accepted" ||
      booking.status === "in_progress" ||
      booking.status === "done") &&
    booking.portfolioConsent == null;

  const showPortfolioUpload =
    booking &&
    booking.status === "done" &&
    booking.portfolioConsent === true &&
    !booking.resultImageUrl;

  return (
    <div className={wide ? "mx-auto max-w-2xl px-6 py-8 pb-28" : "px-4 py-5 pb-28"}>
      <Link
        to="/bookings"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("bookings.title", { defaultValue: "Buyurtmalarim" })}
      </Link>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-[24px] border border-border bg-background">
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-[24px] border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : booking ? (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
            <BookingDetailSummary booking={booking} />
          </div>

          <BookingOrderNumberBanner orderNumber={booking.orderNumber} />

          <CustomerCancelNotice booking={booking} />

          <BookingWaitCountdown booking={booking} />
          <BookingServiceTimer booking={booking} />

          <div className="grid gap-4 sm:grid-cols-2">
            <BookingPaymentCard booking={booking} />
            <BookingCheckInSection booking={booking} />
          </div>

          <BookingLocationCard booking={booking} />

          <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
            <h2 className="mb-4 text-base font-bold">Jarayon</h2>
            <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checkedInAt} />
          </div>

          <BookingStatusHistory history={booking.statusHistory} />

          {showPortfolioConsent ? (
            <BookingPortfolioConsent
              consent={booking.portfolioConsent}
              busy={consentMut.isPending}
              onChange={onPortfolioConsent}
            />
          ) : null}

          {showPortfolioUpload ? (
            <BookingPortfolioUpload busy={portfolioPhotoMut.isPending} onUpload={onPortfolioPhoto} />
          ) : null}

          {booking.status === "in_progress" ? <BookingAddonHint /> : null}

          <BookingResultPreview url={booking.resultImageUrl} />

          {booking.status === "done" ? (
            <PostCompletionSurvey
              key={surveyAutoOpen ? "survey-auto" : "survey"}
              autoOpen={surveyAutoOpen}
              booking={{
                id: booking.id,
                salonName: booking.salonName,
                serviceName: booking.serviceName,
                barberName: booking.barberName,
                hasReview: booking.hasReview,
              }}
            />
          ) : null}
        </div>
      ) : null}

      {booking ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-4px_24px_rgba(41,38,36,0.06)]">
          <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4">
            {booking.status === "in_progress" ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground">
                <span className="inline-flex size-1.5 rounded-full bg-foreground" />
                Xizmat davom etmoqda
              </div>
            ) : null}

            {booking.status !== "done" && booking.status !== "cancelled" ? (
              <>
                {showCancel && cancelPolicy.secondsUntilCutoff != null ? (
                  <p className="text-center text-xs font-medium text-foreground">
                    Bekor qilish: {formatCancelCountdown(cancelPolicy.secondsUntilCutoff)}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <BookingChatButton barberId={booking.barberId} className="flex-1 rounded-xl py-3.5" />
                  {showCancel ? (
                    <button
                      type="button"
                      disabled={cancelMut.isPending}
                      onClick={onCancel}
                      className="flex-1 rounded-xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/30 disabled:opacity-60"
                    >
                      {cancelMut.isPending ? "…" : t("common.cancel")}
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
