import { useRouterState } from "@tanstack/react-router";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { formatCancelCountdown } from "@mybarber/shared/booking-lifecycle";
import { BookingLifecycleStepper } from "@/components/bookings/BookingLifecycleStepper";
import { BookingBarberImpressions } from "@/components/bookings/BookingBarberImpressions";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { BookingStageHero } from "@/components/bookings/BookingStageHero";
import { CustomerCancelNotice } from "@/components/bookings/CustomerCancelNotice";
import { PostCompletionSurvey } from "@/components/bookings/PostCompletionSurvey";
import {
  BookingAddonHint,
  BookingLifecycleTimeline,
  BookingPortfolioConsent,
  BookingPortfolioUpload,
  BookingResultPreview,
} from "@/components/bookings/BookingProcessParts";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";
import type { useBookingProcessPage } from "@/hooks/use-booking-process-page";
import { MOBILE_STICKY_CONTENT_PADDING_CLASS, getMobileBottomInset } from "@/lib/layout-constants";
import { formatPrice, type BookingItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ProcessState = ReturnType<typeof useBookingProcessPage>;

function BookingCompactMeta({ booking }: { booking: BookingItem }) {
  const d = new Date(booking.date);
  const dateStr = d.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const lines = booking.lines?.length
    ? booking.lines
    : [
        {
          service_name: booking.serviceName,
          duration_minutes: booking.duration,
          price: booking.price,
        },
      ];

  return (
    <section className="space-y-3">
      <div>
        <p className="text-lg font-bold">{booking.salonName}</p>
        <p className="text-sm text-muted-foreground">
          {booking.serviceName} · {booking.barberName}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold">{dateStr}</span>
        <span className="font-semibold tabular-nums">{timeStr}</span>
        <span className="font-bold tabular-nums">{formatPrice(booking.price)}</span>
      </div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {lines.map((line, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>{line.service_name}</span>
            <span className="shrink-0 tabular-nums">{formatPrice(line.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BookingLocationRow({ booking }: { booking: BookingItem }) {
  const address = booking.salonAddress?.trim();
  const lat = booking.salonLatitude;
  const lng = booking.salonLongitude;
  if (!address && (lat == null || lng == null)) return null;
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-muted/35 px-4 py-3 transition-colors active:bg-muted/55"
    >
      <MapPin className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Manzil</p>
        {address ? <p className="truncate text-xs text-muted-foreground">{address}</p> : null}
      </div>
      <Navigation className="size-4 shrink-0 text-foreground" />
    </a>
  );
}

function BookingProcessActions({ state, sticky }: { state: ProcessState; sticky?: boolean }) {
  const { booking, t, showCancel, cancelPolicy, cancelMut, onCancel } = state;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bottomInset = getMobileBottomInset(pathname);
  if (!booking) return null;
  if (booking.status === "done" || booking.status === "cancelled") return null;

  const inner = (
    <div className="flex gap-2">
      <BookingChatButton
        barberId={booking.barberId}
        className="flex-1 rounded-2xl bg-foreground py-3.5 text-background"
      />
      {showCancel ? (
        <button
          type="button"
          disabled={cancelMut.isPending}
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-muted/60 py-3.5 text-sm font-semibold text-foreground disabled:opacity-60"
        >
          {cancelMut.isPending ? "…" : t("common.cancel")}
        </button>
      ) : null}
    </div>
  );

  if (!sticky) return <div className="space-y-2">{inner}</div>;

  return (
    <div
      className="fixed inset-x-0 z-30 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-md lg:static lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      style={{ bottom: bottomInset }}
    >
      <div className="mx-auto max-w-lg space-y-2">
        {showCancel && cancelPolicy.secondsUntilCutoff != null ? (
          <p className="text-center text-xs font-medium text-muted-foreground">
            Bekor qilish: {formatCancelCountdown(cancelPolicy.secondsUntilCutoff)}
          </p>
        ) : null}
        {inner}
      </div>
    </div>
  );
}

function BookingProcessBody({
  state,
  stickyActions,
}: {
  state: ProcessState;
  stickyActions?: boolean;
}) {
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

  const showMeta = booking.status !== "accepted" || !!booking.checkedInAt;

  return (
    <div className="space-y-6">
      <BookingLifecycleStepper status={booking.status} checkedIn={!!booking.checkedInAt} />

      <BookingStageHero booking={booking} />

      <CustomerCancelNotice booking={booking} />

      {showMeta ? <BookingCompactMeta booking={booking} /> : null}

      <BookingLocationRow booking={booking} />

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Jarayon
        </p>
        <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checkedInAt} />
      </div>

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

      {!stickyActions ? <BookingProcessActions state={state} /> : null}
      {stickyActions ? <BookingProcessActions state={state} sticky /> : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-destructive/10 px-4 py-5 text-sm text-destructive">
      {message}
    </div>
  );
}

export function BookingProcessMobilePage({ state }: { state: ProcessState }) {
  const { t, booking, isLoading, isError, error } = state;

  return (
    <MobilePageShell
      flush
      backTo="/bookings"
      title={t("bookings.processTitle", { defaultValue: "Bron jarayoni" })}
      subtitle={booking?.salonName}
      className="lg:hidden"
    >
      <div className={cn("space-y-6 px-4 pt-4", MOBILE_STICKY_CONTENT_PADDING_CLASS)}>
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorBlock message={(error as Error).message} />
        ) : booking ? (
          <BookingProcessBody state={state} stickyActions />
        ) : null}
      </div>
    </MobilePageShell>
  );
}
