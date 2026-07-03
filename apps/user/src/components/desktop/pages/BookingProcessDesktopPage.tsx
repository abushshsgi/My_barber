import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatCancelCountdown } from "@mybarber/shared/booking-lifecycle";
import { BookingBarberImpressions } from "@/components/bookings/BookingBarberImpressions";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { CustomerCancelNotice } from "@/components/bookings/CustomerCancelNotice";
import {
  BookingAddonHint,
  BookingCheckInSection,
  BookingDetailSummary,
  BookingLifecycleTimeline,
  BookingLocationCard,
  BookingOrderNumberBanner,
  BookingPaymentCard,
  BookingPortfolioConsent,
  BookingPortfolioUpload,
  BookingResultPreview,
  BookingServiceTimer,
  BookingStatusHistory,
  BookingWaitCountdown,
} from "@/components/bookings/BookingProcessParts";
import { DESKTOP_ACCOUNT_BG, DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import type { useBookingProcessPage } from "@/hooks/use-booking-process-page";
import { cn } from "@/lib/utils";

type ProcessState = ReturnType<typeof useBookingProcessPage>;

function ProcessPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function BookingProcessActions({
  state,
  layout,
}: {
  state: ProcessState;
  layout: "mobile" | "desktop";
}) {
  const { booking, t, showCancel, cancelPolicy, cancelMut, onCancel } = state;
  if (!booking) return null;
  if (booking.status === "done" || booking.status === "cancelled") return null;

  const inner = (
    <>
      {booking.status === "in_progress" ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground">
          <span className="inline-flex size-1.5 rounded-full bg-emerald-500" />
          Xizmat davom etmoqda
        </div>
      ) : null}

      {showCancel && cancelPolicy.secondsUntilCutoff != null ? (
        <p className="text-center text-xs font-medium text-foreground">
          Bekor qilish: {formatCancelCountdown(cancelPolicy.secondsUntilCutoff)}
        </p>
      ) : null}

      <div className="flex gap-2">
        <BookingChatButton
          barberId={booking.barberId}
          className={cn(
            "flex-1 rounded-xl py-3.5",
            layout === "desktop" && "border border-border bg-card",
          )}
        />
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
  );

  if (layout === "desktop") {
    return <ProcessPanel className="space-y-3">{inner}</ProcessPanel>;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-4px_24px_rgba(41,38,36,0.06)] lg:hidden">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4">{inner}</div>
    </div>
  );
}

function BookingProcessMainColumn({ state }: { state: ProcessState }) {
  const {
    booking,
    consentMut,
    portfolioPhotoMut,
    surveyAutoOpen,
    showPortfolioConsent,
    showPortfolioUpload,
    onPortfolioConsent,
    onPortfolioPhoto,
  } = state;

  if (!booking) return null;

  return (
    <div className="min-w-0 space-y-4">
      <CustomerCancelNotice booking={booking} />

      <div className="grid gap-4 xl:grid-cols-2">
        <BookingPaymentCard booking={booking} />
        <BookingCheckInSection booking={booking} />
      </div>

      <BookingLocationCard booking={booking} />

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
        <BookingBarberImpressions
          barberName={booking.barberName}
          kinds={booking.barberImpressions}
        />
      ) : null}

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

      <BookingStatusHistory history={booking.statusHistory} />
    </div>
  );
}

function BookingProcessSidebar({ state }: { state: ProcessState }) {
  const { booking } = state;
  if (!booking) return null;

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <ProcessPanel>
        <BookingDetailSummary booking={booking} />
      </ProcessPanel>

      <BookingOrderNumberBanner orderNumber={booking.orderNumber} />

      <BookingWaitCountdown booking={booking} />
      <BookingServiceTimer booking={booking} />

      <ProcessPanel>
        <h2 className="mb-4 text-base font-bold">Jarayon</h2>
        <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checkedInAt} />
      </ProcessPanel>

      <BookingProcessActions state={state} layout="desktop" />
    </aside>
  );
}

export function BookingProcessDesktopPage({ state }: { state: ProcessState }) {
  const { t, booking, isLoading, isError, error } = state;

  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6 py-8 pb-12", DESKTOP_ACCOUNT_BG)}>
      <Link
        to="/bookings"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("bookings.title", { defaultValue: "Buyurtmalarim" })}
      </Link>

      <DesktopPageHeader
        title={t("bookings.processTitle", { defaultValue: "Bron jarayoni" })}
        description={booking?.salonName}
        breadcrumb={[
          { label: t("bookings.title", { defaultValue: "Buyurtmalarim" }) },
          { label: booking?.orderNumber ? `#${booking.orderNumber}` : "Bron" },
        ]}
      />

      {isLoading ? (
        <div className={cn(DESKTOP_GLASS_PANEL, "mt-8 flex h-56 items-center justify-center")}>
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="mt-8 rounded-[24px] border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : booking ? (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <BookingProcessMainColumn state={state} />
          <BookingProcessSidebar state={state} />
        </div>
      ) : null}
    </div>
  );
}

export function BookingProcessMobilePage({ state }: { state: ProcessState }) {
  const { t, booking, isLoading, isError, error } = state;

  return (
    <div className="px-4 py-5 pb-28 lg:hidden">
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
          <ProcessPanel>
            <BookingDetailSummary booking={booking} />
          </ProcessPanel>

          <BookingOrderNumberBanner orderNumber={booking.orderNumber} />
          <CustomerCancelNotice booking={booking} />
          <BookingWaitCountdown booking={booking} />
          <BookingServiceTimer booking={booking} />

          <div className="grid gap-4 sm:grid-cols-2">
            <BookingPaymentCard booking={booking} />
            <BookingCheckInSection booking={booking} />
          </div>

          <BookingLocationCard booking={booking} />

          <ProcessPanel>
            <h2 className="mb-4 text-base font-bold">Jarayon</h2>
            <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checkedInAt} />
          </ProcessPanel>

          <BookingStatusHistory history={booking.statusHistory} />

          {state.showPortfolioConsent ? (
            <BookingPortfolioConsent
              consent={booking.portfolioConsent}
              busy={state.consentMut.isPending}
              onChange={state.onPortfolioConsent}
            />
          ) : null}

          {state.showPortfolioUpload ? (
            <BookingPortfolioUpload
              busy={state.portfolioPhotoMut.isPending}
              onUpload={state.onPortfolioPhoto}
            />
          ) : null}

          {booking.status === "in_progress" ? <BookingAddonHint /> : null}

          <BookingResultPreview url={booking.resultImageUrl} />

          {booking.status === "done" ? (
            <BookingBarberImpressions
              barberName={booking.barberName}
              kinds={booking.barberImpressions}
            />
          ) : null}

          {booking.status === "done" ? (
            <PostCompletionSurvey
              key={state.surveyAutoOpen ? "survey-auto" : "survey"}
              autoOpen={state.surveyAutoOpen}
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

      <BookingProcessActions state={state} layout="mobile" />
    </div>
  );
}
