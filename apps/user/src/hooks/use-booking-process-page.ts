import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { playBookingCompletionChime } from "@mybarber/shared/booking-lifecycle";
import { useLiveCustomerCancelPolicy } from "@/components/bookings/CustomerCancelNotice";
import {
  useBooking,
  useCancelBooking,
  usePortfolioConsentMutation,
  usePortfolioPhotoMutation,
} from "@/hooks/use-bookings-api";

export function useBookingProcessPage(bookingId: string, options?: { forceSurveyOpen?: boolean }) {
  const { t } = useTranslation();
  const { data: booking, isLoading, isError, error } = useBooking(bookingId);
  const cancelMut = useCancelBooking();
  const consentMut = usePortfolioConsentMutation();
  const portfolioPhotoMut = usePortfolioPhotoMutation();
  const prevStatus = useRef<string | null>(null);
  const [surveyAutoOpen, setSurveyAutoOpen] = useState(false);

  useEffect(() => {
    if (!booking) return;
    const prev = prevStatus.current;
    const justCompleted =
      booking.status === "done" &&
      prev !== "done" &&
      (prev === "in_progress" || prev === "accepted");
    if (justCompleted) {
      playBookingCompletionChime();
      if (!booking.hasReview) setSurveyAutoOpen(true);
    }
    prevStatus.current = booking.status;
  }, [booking?.status, booking?.hasReview, booking]);

  useEffect(() => {
    if (options?.forceSurveyOpen && booking?.status === "done" && !booking.hasReview) {
      setSurveyAutoOpen(true);
    }
  }, [options?.forceSurveyOpen, booking?.status, booking?.hasReview, booking]);

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
      onSuccess: () =>
        toast.success(t("bookings.cancelled", { defaultValue: "Bron bekor qilindi" })),
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

  return {
    t,
    booking,
    isLoading,
    isError,
    error,
    cancelMut,
    consentMut,
    portfolioPhotoMut,
    surveyAutoOpen,
    cancelPolicy,
    showCancel,
    onCancel,
    onPortfolioConsent,
    onPortfolioPhoto,
    showPortfolioConsent,
    showPortfolioUpload,
  };
}
