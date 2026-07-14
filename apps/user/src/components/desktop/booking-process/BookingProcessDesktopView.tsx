import { Link } from "@tanstack/react-router";
import {
  buildCheckInQrUrl,
  computeAppointmentCountdown,
  formatCancelCountdown,
  formatHistoryWhen,
} from "@mybarber/shared/booking-lifecycle";
import { ArrowLeft, Loader2, MapPin, Navigation, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import { BookingBarberImpressions } from "@/components/bookings/BookingBarberImpressions";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { PostCompletionSurvey } from "@/components/bookings/PostCompletionSurvey";
import {
  BookingLifecycleTimeline,
  BookingPortfolioConsent,
  BookingPortfolioUpload,
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

const CARD =
  "rounded-2xl border border-border/80 bg-background p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]";

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
    shortDate: d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }),
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
      return { title: "Keldingiz", body: "Sartarosh tez orada xizmatni boshlaydi." };
    case "in_progress":
      return { title: "Xizmat davom etmoqda", body: `${booking.barberName} bilan xizmat vaqti.` };
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

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-lg font-bold tracking-tight">{children}</h2>;
}

function Row({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3.5 text-sm",
        !last && "border-b border-border/70",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function CheckoutCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD, className)}>
      {title ? <CardTitle>{title}</CardTitle> : null}
      {children}
    </section>
  );
}

function DesktopQrCard({ booking }: { booking: BookingItem }) {
  const loading = !booking.checkInCode;

  return (
    <CheckoutCard title="Kelish QR kodi">
      <div className="flex flex-wrap items-center gap-8">
        <div className="grid size-48 shrink-0 place-items-center rounded-xl border border-border bg-surface/40 xl:size-52">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="size-7 animate-spin" />
              <span className="text-xs">QR tayyorlanmoqda…</span>
            </div>
          ) : (
            <img
              src={buildCheckInQrUrl(booking.checkInCode!, 220)}
              alt="Kelish QR kodi"
              className="size-full rounded-lg object-contain p-2"
            />
          )}
        </div>
        <div className="min-w-[10rem] flex-1">
          <p className="text-xs font-medium text-muted-foreground">Zaxira kod</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.28em]">
            {loading ? "————" : (booking.checkInShortCode ?? "----")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Kod bir martalik. Muammo bo&apos;lsa, raqamni sartaroshga ayting.
          </p>
        </div>
      </div>
    </CheckoutCard>
  );
}

function DesktopTimerCard({ booking }: { booking: BookingItem }) {
  const timer = useLiveBookingTimer(booking);
  const live = booking.status === "in_progress";
  const radius = 44;
  const stroke = 5;
  const c = 2 * Math.PI * radius;
  const size = radius * 2 + stroke * 2;
  const dashOffset = c * (1 - timer.progress / 100);

  return (
    <CheckoutCard title={live ? "Xizmat vaqti" : "Jami vaqt"}>
      <div className="flex flex-wrap items-center gap-8">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className="text-border"
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
            <span className="font-mono text-xl font-bold tabular-nums">{timer.elapsedLabel}</span>
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 space-y-3">
          {live ? (
            <p className="text-sm text-muted-foreground">
              Qolgan vaqt:{" "}
              <span className="font-mono font-semibold text-foreground">
                −{timer.remainingLabel}
              </span>
            </p>
          ) : null}
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-700"
              style={{ width: `${Math.min(100, timer.progress)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Reja: {booking.duration} daqiqa</p>
        </div>
      </div>
    </CheckoutCard>
  );
}

function DesktopWaitCountdownCard({ booking }: { booking: BookingItem }) {
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
    <CheckoutCard title="Bron vaqtigacha">
      <p className="font-mono text-3xl font-bold tabular-nums">{cd.label}</p>
      <p className="mt-1 text-sm text-muted-foreground">qoldi</p>
    </CheckoutCard>
  );
}

function DesktopCancelCard({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  return (
    <CheckoutCard title="Bekor qilish oynasi">
      <p className="text-sm text-muted-foreground">5 daqiqa ichida bepul bekor qilish mumkin</p>
      <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
        {formatCancelCountdown(left)}
      </p>
    </CheckoutCard>
  );
}

function DesktopAddressCard({ booking }: { booking: BookingItem }) {
  const address = booking.salonAddress?.trim();
  const lat = booking.salonLatitude;
  const lng = booking.salonLongitude;
  if (!address && (lat == null || lng == null)) return null;

  const url =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;

  return (
    <CheckoutCard title="Manzil">
      <div className="mb-4 flex gap-3 rounded-xl border border-border/70 bg-surface/30 p-4">
        <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        {address ? <p className="text-sm leading-relaxed">{address}</p> : null}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold transition-colors hover:bg-surface/50"
      >
        <Navigation className="size-4" />
        Yo&apos;nalish olish
      </a>
    </CheckoutCard>
  );
}

function DesktopPaymentCard({ booking }: { booking: BookingItem }) {
  const isCash = booking.paymentMethod === "cash" || !booking.paymentMethod;
  const paid = booking.paymentStatus === "paid" || !!booking.paidAt;

  return (
    <CheckoutCard title="To'lov">
      <Row label="Usul" value={isCash ? "Naqd pul" : "Onlayn to'lov"} />
      <Row label="Holat" value={paid ? "To'langan" : "To'lanmagan"} />
      <Row label="Summa" value={formatPrice(booking.price)} last />
    </CheckoutCard>
  );
}

function DesktopHistoryCard({ history }: { history?: BookingItem["statusHistory"] }) {
  const rows = history ?? [];
  if (!rows.length) return null;

  return (
    <CheckoutCard title="Tarix">
      <ul>
        {rows.map((row, i) => (
          <li
            key={`${row.key}-${row.at}`}
            className={cn(
              "flex justify-between gap-4 py-3 text-sm",
              i < rows.length - 1 && "border-b border-border/70",
            )}
          >
            <span>{row.label}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatHistoryWhen(row.at)}
            </span>
          </li>
        ))}
      </ul>
    </CheckoutCard>
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
      <div className={cn("hidden lg:block", CARD, "m-8 text-sm text-destructive")}>
        {(error as Error).message}
      </div>
    );
  }

  if (!booking) return null;

  const phase = getPhase(booking);
  const copy = statusCopy(phase, booking);
  const { date, time, shortDate } = formatLabels(booking);
  const showQr = phase === "accepted_qr" || phase === "accepted_loading";
  const showTimer = phase === "in_progress" || phase === "done";
  const showCancelHint =
    showCancel && cancelPolicy.secondsUntilCutoff != null && (phase === "pending" || showQr);

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
    <div className="hidden min-h-[calc(100dvh-4.5rem)] w-full bg-muted/45 lg:block">
      <div className={cn("mx-auto w-full max-w-[1280px] py-8", DESKTOP_SHELL_INSET)}>
        <Link
          to="/bookings"
          search={{}}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("bookings.title", { defaultValue: "Buyurtmalarim" })}
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("bookings.processTitle", { defaultValue: "Bron jarayoni" })} · {booking.salonName}
            </p>
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            #{booking.orderNumber ?? booking.id.slice(0, 8)}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Chap ustun — asosiy kartalar */}
          <div className="space-y-4">
            <CheckoutCard title="Holat">
              <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
              {phase !== "cancelled" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[booking.barberName, shortDate, time].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-medium"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </CheckoutCard>

            {showQr ? <DesktopQrCard booking={booking} /> : null}
            {showTimer ? <DesktopTimerCard booking={booking} /> : null}

            {showPortfolioConsent ? (
              <CheckoutCard title="Portfolio ruxsati">
                <BookingPortfolioConsent
                  plain
                  consent={booking.portfolioConsent}
                  busy={consentMut.isPending}
                  onChange={onPortfolioConsent}
                />
              </CheckoutCard>
            ) : null}

            {phase !== "cancelled" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <DesktopPaymentCard booking={booking} />
                <DesktopAddressCard booking={booking} />
              </div>
            ) : null}

            {booking.status === "done" ? (
              <CheckoutCard>
                <BookingBarberImpressions
                  barberName={booking.barberName}
                  kinds={booking.barberImpressions}
                  plain
                />
              </CheckoutCard>
            ) : null}

            {showPortfolioUpload ? (
              <CheckoutCard>
                <BookingPortfolioUpload
                  busy={portfolioPhotoMut.isPending}
                  onUpload={onPortfolioPhoto}
                />
              </CheckoutCard>
            ) : null}

            {booking.resultImageUrl ? (
              <CheckoutCard title="Natija">
                <img
                  src={booking.resultImageUrl}
                  alt="Xizmat natijasi"
                  className="max-h-80 w-full rounded-xl object-cover"
                />
              </CheckoutCard>
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
              <CheckoutCard>
                <Link
                  to="/"
                  className="flex w-full items-center justify-center rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background"
                >
                  Qayta bron qilish
                </Link>
              </CheckoutCard>
            ) : null}
          </div>

          {/* O'ng ustun — xulosa (Uzum checkout sidebar) */}
          <aside className="space-y-4 xl:sticky xl:top-8">
            <section className={cn(CARD, "p-0")}>
              <div className="border-b border-border/70 p-6">
                <CardTitle>Sizning broningiz</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface/50">
                    <Scissors className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{booking.salonName}</p>
                    <p className="text-sm text-muted-foreground">{booking.barberName}</p>
                  </div>
                </div>
              </div>

              <div className="px-6">
                {lines.map((line, i) => (
                  <Row
                    key={i}
                    label={i === 0 ? "Xizmat" : line.service_name}
                    value={i === 0 ? line.service_name : formatPrice(line.price)}
                  />
                ))}
                <Row label="Davomiylik" value={`${booking.duration} daqiqa`} />
                <Row label="Sana" value={date} />
                <Row label="Vaqt" value={time} last />
              </div>

              <div className="border-t border-border/70 px-6 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Jami</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {formatPrice(booking.price)}
                  </span>
                </div>

                {booking.status !== "done" && booking.status !== "cancelled" ? (
                  <div className="mt-5 space-y-3">
                    <BookingChatButton
                      barberId={booking.barberId}
                      className="w-full flex-none rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background shadow-sm"
                    />
                    {showCancel ? (
                      <button
                        type="button"
                        disabled={cancelMut.isPending}
                        onClick={onCancel}
                        className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface/50 disabled:opacity-60"
                      >
                        {cancelMut.isPending
                          ? "…"
                          : t("common.cancel", { defaultValue: "Bekor qilish" })}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {showCancelHint ? (
              <DesktopCancelCard seconds={cancelPolicy.secondsUntilCutoff!} />
            ) : null}

            <DesktopWaitCountdownCard booking={booking} />

            <CheckoutCard title="Jarayon">
              <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checkedInAt} />
            </CheckoutCard>

            <DesktopHistoryCard history={booking.statusHistory} />
          </aside>
        </div>
      </div>
    </div>
  );
}
