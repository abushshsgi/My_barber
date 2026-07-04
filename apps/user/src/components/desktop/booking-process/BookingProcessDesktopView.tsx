import { Link } from "@tanstack/react-router";
import {
  buildCheckInQrUrl,
  computeAppointmentCountdown,
  formatCancelCountdown,
  formatHistoryWhen,
} from "@mybarber/shared/booking-lifecycle";
import { ArrowLeft, Loader2, MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import { BookingBarberImpressions } from "@/components/bookings/BookingBarberImpressions";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { PostCompletionSurvey } from "@/components/bookings/PostCompletionSurvey";
import {
  BookingLifecycleTimeline,
  BookingPortfolioConsent,
  BookingPortfolioUpload,
  BookingResultPreview,
  useLiveBookingTimer,
} from "@/components/bookings/BookingProcessParts";
import type { useBookingProcessPage } from "@/hooks/use-booking-process-page";
import { DESKTOP_SHELL_INSET } from "@/lib/desktop-bazaar-layout";
import { formatPrice, type BookingItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ProcessState = ReturnType<typeof useBookingProcessPage>;

type Phase =
  | "pending"
  | "accepted_loading"
  | "accepted_qr"
  | "checked_in"
  | "in_progress"
  | "done"
  | "cancelled";

function getPhase(booking: BookingItem): Phase {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "done") return "done";
  if (booking.status === "in_progress") return "in_progress";
  if (booking.status === "accepted" && booking.checkedInAt) return "checked_in";
  if (booking.status === "accepted")
    return booking.checkInCode ? "accepted_qr" : "accepted_loading";
  return "pending";
}

function formatLabels(booking: BookingItem) {
  const d = new Date(booking.date);
  return {
    date: d.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" }),
    time: d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
  };
}

function statusCopy(phase: Phase, booking: BookingItem) {
  switch (phase) {
    case "accepted_loading":
    case "accepted_qr":
      return {
        title: "Buyurtma tasdiqlandi",
        body: `${booking.barberName} broningizni qabul qildi. Salonga kelganingizda QR kodni ko'rsating.`,
      };
    case "checked_in":
      return {
        title: "Keldingiz",
        body: "Sartarosh tez orada xizmatni boshlaydi.",
      };
    case "in_progress":
      return {
        title: "Xizmat davom etmoqda",
        body: `${booking.barberName} bilan xizmat vaqti.`,
      };
    case "done":
      return {
        title: "Xizmat yakunlandi",
        body: `${booking.barberName} · ${formatPrice(booking.price)}`,
      };
    case "cancelled":
      return {
        title: "Bron bekor qilindi",
        body: "Yangi vaqt tanlab qayta bron qilishingiz mumkin.",
      };
    default:
      return {
        title: "Tasdiqlanish kutilmoqda",
        body: `${booking.barberName} broningizni ko'rib chiqmoqda.`,
      };
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function DesktopQrPanel({ booking }: { booking: BookingItem }) {
  const loading = !booking.checkInCode;

  return (
    <section>
      <SectionLabel>Kelish QR kodi</SectionLabel>
      <div className="flex flex-wrap items-center gap-10 xl:gap-16">
        <div className="grid size-52 shrink-0 place-items-center bg-surface/60 xl:size-60">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-7 animate-spin" />
              <span className="text-xs">QR tayyorlanmoqda…</span>
            </div>
          ) : (
            <img
              src={buildCheckInQrUrl(booking.checkInCode!, 256)}
              alt="Kelish QR kodi"
              className="size-full object-contain p-3"
            />
          )}
        </div>
        <div className="min-w-[12rem] flex-1">
          <p className="text-xs text-muted-foreground">Zaxira kod</p>
          <p className="mt-2 font-mono text-4xl font-bold tracking-[0.3em] xl:text-5xl">
            {loading ? "————" : (booking.checkInShortCode ?? "----")}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Kod bir martalik. Muammo bo&apos;lsa, raqamni sartaroshga ayting.
          </p>
        </div>
      </div>
    </section>
  );
}

function DesktopTimer({ booking, compact }: { booking: BookingItem; compact?: boolean }) {
  const timer = useLiveBookingTimer(booking);
  const live = booking.status === "in_progress";
  const radius = compact ? 52 : 72;
  const stroke = compact ? 6 : 8;
  const c = 2 * Math.PI * radius;
  const size = radius * 2 + stroke * 2;
  const dashOffset = c * (1 - timer.progress / 100);

  return (
    <section className={compact ? "" : "py-2"}>
      {!compact ? <SectionLabel>{live ? "Xizmat vaqti" : "Jami vaqt"}</SectionLabel> : null}
      <div className={cn("flex flex-col items-start", compact && "items-center")}>
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className="text-muted/30"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dashOffset}
              className="text-foreground transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn("font-mono font-bold tabular-nums", compact ? "text-xl" : "text-4xl")}
            >
              {timer.elapsedLabel}
            </span>
            {live ? (
              <span className="mt-1 text-xs text-muted-foreground">−{timer.remainingLabel}</span>
            ) : null}
          </div>
        </div>
        {!compact ? (
          <p className="mt-4 text-sm text-muted-foreground">Reja: {booking.duration} daqiqa</p>
        ) : null}
      </div>
    </section>
  );
}

function DesktopWaitCountdown({ booking }: { booking: BookingItem }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (booking.status !== "pending" && booking.status !== "accepted") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking.status]);

  if (booking.status === "in_progress" || booking.status === "done") return null;
  const cd = computeAppointmentCountdown(booking.date, now);
  if (!cd.isUpcoming) return null;

  return (
    <div>
      <SectionLabel>Bron vaqtigacha</SectionLabel>
      <p className="font-mono text-3xl font-bold tabular-nums">{cd.label}</p>
    </div>
  );
}

function DesktopCancelHint({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  return (
    <div>
      <SectionLabel>Bekor qilish</SectionLabel>
      <p className="text-sm text-muted-foreground">5 daqiqa ichida bepul bekor qilish mumkin</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
        {formatCancelCountdown(left)}
      </p>
    </div>
  );
}

function DesktopHistory({ history }: { history?: BookingItem["statusHistory"] }) {
  const rows = history ?? [];
  if (!rows.length) return null;
  return (
    <div>
      <SectionLabel>Tarix</SectionLabel>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={`${row.key}-${row.at}`} className="flex justify-between gap-4 text-sm">
            <span>{row.label}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatHistoryWhen(row.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesktopAddress({ booking }: { booking: BookingItem }) {
  const address = booking.salonAddress?.trim();
  const lat = booking.salonLatitude;
  const lng = booking.salonLongitude;
  if (!address && (lat == null || lng == null)) return null;

  const url =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;

  return (
    <section>
      <SectionLabel>Manzil</SectionLabel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {address ? <p className="text-sm leading-relaxed">{address}</p> : null}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          <Navigation className="size-4" />
          Yo&apos;nalish
        </a>
      </div>
    </section>
  );
}

function LoadingBlock() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function BookingProcessDesktopView({ state }: { state: ProcessState }) {
  const {
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
  } = state;

  if (isLoading) {
    return <div className="hidden lg:block">{LoadingBlock()}</div>;
  }

  if (isError) {
    return (
      <div className="hidden p-8 text-sm text-destructive lg:block">{(error as Error).message}</div>
    );
  }

  if (!booking) return null;

  const phase = getPhase(booking);
  const copy = statusCopy(phase, booking);
  const { date, time } = formatLabels(booking);
  const showQr = phase === "accepted_qr" || phase === "accepted_loading";
  const showTimer = phase === "in_progress" || phase === "done";
  const showCancelHint =
    showCancel && cancelPolicy.secondsUntilCutoff != null && (phase === "pending" || showQr);
  const isCash = booking.paymentMethod === "cash" || !booking.paymentMethod;
  const paid = booking.paymentStatus === "paid" || !!booking.paidAt;

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
    <div
      className={cn(
        "hidden min-h-[calc(100dvh-4.25rem)] w-full bg-background lg:flex lg:flex-col",
        DESKTOP_SHELL_INSET,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-6 py-8">
        <Link
          to="/bookings"
          search={{}}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("bookings.title", { defaultValue: "Buyurtmalarim" })}
        </Link>
        <p className="font-mono text-xs text-muted-foreground">
          #{booking.orderNumber ?? booking.id.slice(0, 8)}
        </p>
      </header>

      <div className="flex flex-1 flex-col pb-16">
        <div className="mb-10 max-w-3xl">
          <p className="label-eyebrow mb-2">
            {t("bookings.processTitle", { defaultValue: "Bron jarayoni" })}
          </p>
          <h1 className="text-4xl font-bold tracking-tight xl:text-5xl">{copy.title}</h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">{copy.body}</p>
          {phase !== "cancelled" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {booking.salonName} · {date} · {time}
            </p>
          ) : null}
        </div>

        <div className="grid flex-1 items-start gap-16 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] 2xl:gap-24">
          <div className="space-y-12">
            {showQr ? <DesktopQrPanel booking={booking} /> : null}
            {showTimer ? <DesktopTimer booking={booking} /> : null}

            {phase !== "cancelled" ? (
              <div className="grid gap-12 md:grid-cols-2">
                <section>
                  <SectionLabel>To&apos;lov</SectionLabel>
                  <MetaRow label="Usul" value={isCash ? "Naqd pul" : "Onlayn"} />
                  <MetaRow label="Holat" value={paid ? "To'langan" : "To'lanmagan"} />
                  <MetaRow label="Summa" value={formatPrice(booking.price)} />
                </section>
                <DesktopAddress booking={booking} />
              </div>
            ) : null}

            {booking.status === "done" ? (
              <BookingBarberImpressions
                barberName={booking.barberName}
                kinds={booking.barberImpressions}
                plain
              />
            ) : null}

            {showPortfolioUpload ? (
              <BookingPortfolioUpload
                busy={portfolioPhotoMut.isPending}
                onUpload={onPortfolioPhoto}
              />
            ) : null}

            <BookingResultPreview url={booking.resultImageUrl} />

            {showPortfolioConsent ? (
              <BookingPortfolioConsent
                consent={booking.portfolioConsent}
                busy={consentMut.isPending}
                onChange={onPortfolioConsent}
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

            {phase === "cancelled" ? (
              <Link
                to="/"
                className="inline-flex text-sm font-semibold underline-offset-4 hover:underline"
              >
                Qayta bron qilish
              </Link>
            ) : null}
          </div>

          <aside className="space-y-10 xl:sticky xl:top-8 xl:self-start">
            <div>
              <SectionLabel>Bron ma&apos;lumotlari</SectionLabel>
              <p className="text-lg font-semibold">{booking.salonName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{booking.barberName}</p>
              <div className="mt-6 space-y-0">
                {lines.map((line, i) => (
                  <MetaRow
                    key={i}
                    label={i === 0 ? "Xizmat" : line.service_name}
                    value={i === 0 ? line.service_name : formatPrice(line.price)}
                  />
                ))}
                <MetaRow label="Davomiylik" value={`${booking.duration} daq`} />
                <MetaRow label="Sana" value={date} />
                <MetaRow label="Vaqt" value={time} />
                <div className="pt-4">
                  <MetaRow label="Jami" value={formatPrice(booking.price)} />
                </div>
              </div>
            </div>

            {showCancelHint ? (
              <DesktopCancelHint seconds={cancelPolicy.secondsUntilCutoff!} />
            ) : null}
            <DesktopWaitCountdown booking={booking} />

            <div>
              <SectionLabel>Jarayon</SectionLabel>
              <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checkedInAt} />
            </div>

            <DesktopHistory history={booking.statusHistory} />

            {phase === "in_progress" ? <DesktopTimer booking={booking} compact /> : null}

            {booking.status !== "done" && booking.status !== "cancelled" ? (
              <div className="space-y-4 pt-2">
                <BookingChatButton
                  barberId={booking.barberId}
                  className="w-full flex-none rounded-none bg-foreground py-3.5 text-sm font-semibold text-background"
                />
                {showCancel ? (
                  <button
                    type="button"
                    disabled={cancelMut.isPending}
                    onClick={onCancel}
                    className="w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                  >
                    {cancelMut.isPending
                      ? "…"
                      : t("common.cancel", { defaultValue: "Bekor qilish" })}
                  </button>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
