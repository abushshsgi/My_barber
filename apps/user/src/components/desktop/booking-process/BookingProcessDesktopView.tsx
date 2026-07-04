import { Link } from "@tanstack/react-router";
import { buildCheckInQrUrl, formatCancelCountdown } from "@mybarber/shared/booking-lifecycle";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Clock3,
  CreditCard,
  Hash,
  Loader2,
  MapPin,
  Navigation,
  QrCode,
  Scissors,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BookingBarberImpressions } from "@/components/bookings/BookingBarberImpressions";
import { BookingChatButton } from "@/components/bookings/BookingChatButton";
import { CustomerCancelNotice } from "@/components/bookings/CustomerCancelNotice";
import { PostCompletionSurvey } from "@/components/bookings/PostCompletionSurvey";
import {
  BookingLifecycleTimeline,
  BookingPortfolioConsent,
  BookingPortfolioUpload,
  BookingResultPreview,
  BookingStatusHistory,
  BookingWaitCountdown,
  useLiveBookingTimer,
} from "@/components/bookings/BookingProcessParts";
import type { useBookingProcessPage } from "@/hooks/use-booking-process-page";
import { formatPrice, type BookingItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ProcessState = ReturnType<typeof useBookingProcessPage>;

type DesktopPhase =
  | "pending"
  | "accepted_loading"
  | "accepted_qr"
  | "checked_in"
  | "in_progress"
  | "done"
  | "cancelled";

function getDesktopPhase(booking: BookingItem): DesktopPhase {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "done") return "done";
  if (booking.status === "in_progress") return "in_progress";
  if (booking.status === "accepted" && booking.checkedInAt) return "checked_in";
  if (booking.status === "accepted") {
    return booking.checkInCode ? "accepted_qr" : "accepted_loading";
  }
  return "pending";
}

function formatBookingLabels(booking: BookingItem) {
  const d = new Date(booking.date);
  return {
    dateLabel: d.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" }),
    timeLabel: d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
    shortDate: d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }),
  };
}

function DesktopBookingHero({ booking }: { booking: BookingItem }) {
  const phase = getDesktopPhase(booking);
  const { dateLabel, timeLabel } = formatBookingLabels(booking);
  const priceLabel = formatPrice(booking.price);

  const config = (() => {
    switch (phase) {
      case "accepted_loading":
      case "accepted_qr":
        return {
          container: "bg-foreground text-background",
          iconWrap: "bg-emerald-500 text-white",
          icon: <CheckCircle2 className="size-6" strokeWidth={2.5} />,
          eyebrow: "text-background/50",
          title: "text-background",
          body: "text-background/70",
          heading: "Buyurtma tasdiqlandi!",
          subtitle: `${booking.barberName} broningizni qabul qildi. Salonga kelganingizda QR kodni sartaroshga ko'rsating.`,
          chip: "bg-background/10 text-background/90 ring-1 ring-background/10",
        };
      case "checked_in":
        return {
          container: "bg-emerald-600 text-white",
          iconWrap: "bg-white/20 text-white",
          icon: <CheckCircle2 className="size-6" strokeWidth={2.5} />,
          eyebrow: "text-white/70",
          title: "text-white",
          body: "text-white/90",
          heading: "Keldingiz — xush kelibsiz!",
          subtitle: "Sartarosh tez orada xizmatni boshlaydi. Iltimos, kutish zonasida joy oling.",
          chip: "bg-white/15 text-white ring-1 ring-white/20",
        };
      case "in_progress":
        return {
          container: "bg-emerald-950 text-white",
          iconWrap: "bg-white/10 text-white",
          icon: <Clock className="size-6" strokeWidth={2.5} />,
          eyebrow: "text-white/50",
          title: "text-white",
          body: "text-white/70",
          heading: "Xizmat davom etmoqda",
          subtitle: `${booking.barberName} siz bilan ishlamoqda. Vaqt taymeri jonli yangilanadi.`,
          chip: "bg-white/10 text-white/90 ring-1 ring-white/10",
        };
      case "done":
        return {
          container: "bg-foreground text-background",
          iconWrap: "bg-background/10 text-background",
          icon: <Sparkles className="size-6" strokeWidth={2.5} />,
          eyebrow: "text-background/50",
          title: "text-background",
          body: "text-background/70",
          heading: "Xizmat yakunlandi",
          subtitle: `${booking.barberName} · ${priceLabel}. Kuningiz xayrli o'tsin!`,
          chip: "bg-background/10 text-background/90 ring-1 ring-background/10",
        };
      case "cancelled":
        return {
          container: "bg-muted text-foreground",
          iconWrap: "bg-muted-foreground/15 text-muted-foreground",
          icon: <XCircle className="size-6" strokeWidth={2.5} />,
          eyebrow: "text-muted-foreground",
          title: "text-foreground",
          body: "text-muted-foreground",
          heading: "Bron bekor qilindi",
          subtitle: "Yangi vaqt tanlab qayta bron qilishingiz mumkin.",
          chip: "bg-background text-muted-foreground ring-1 ring-border",
        };
      default:
        return {
          container: "bg-amber-50 text-foreground",
          iconWrap: "bg-amber-200/80 text-amber-900",
          icon: <Clock3 className="size-6" strokeWidth={2.5} />,
          eyebrow: "text-amber-800/70",
          title: "text-foreground",
          body: "text-muted-foreground",
          heading: "Tasdiqlanish kutilmoqda",
          subtitle: `${booking.barberName} broningizni ko'rib chiqmoqda.`,
          chip: "bg-background text-muted-foreground ring-1 ring-border",
        };
    }
  })();

  return (
    <section className={cn("animate-in fade-in rounded-[28px] p-8 duration-300", config.container)}>
      <div className="flex items-start gap-4">
        <div
          className={cn("grid size-11 shrink-0 place-items-center rounded-full", config.iconWrap)}
        >
          {config.icon}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "mb-2 block text-[10px] font-semibold uppercase tracking-widest",
              config.eyebrow,
            )}
          >
            Buyurtma #{booking.orderNumber ?? booking.id.slice(0, 8)}
          </span>
          <h2
            className={cn(
              "text-balance text-2xl font-semibold leading-tight xl:text-3xl",
              config.title,
            )}
          >
            {config.heading}
          </h2>
          <p className={cn("mt-2 text-pretty text-sm xl:text-base", config.body)}>
            {config.subtitle}
          </p>
        </div>
      </div>
      {phase !== "cancelled" ? (
        <div className="mt-6 flex flex-wrap gap-2 text-xs xl:text-sm">
          {[booking.salonName, dateLabel, timeLabel].map((label) => (
            <span key={label} className={cn("rounded-full px-3 py-1.5 font-medium", config.chip)}>
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DesktopQrBlock({ booking }: { booking: BookingItem }) {
  const loading = !booking.checkInCode;

  return (
    <section className="rounded-[28px] bg-card p-8 shadow-sm ring-1 ring-border/60">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-foreground text-background">
          <QrCode className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-tight">Kelish QR kodi</h3>
          <p className="text-sm text-muted-foreground">
            Sartaroshga skanerlashi uchun ko&apos;rsating
          </p>
        </div>
      </header>

      <div className="flex flex-col items-center gap-6">
        <div className="rounded-3xl bg-white p-4 ring-1 ring-border">
          <div className="relative grid size-60 place-items-center overflow-hidden rounded-2xl bg-white">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-foreground" />
                <span className="text-xs font-medium">QR tayyorlanmoqda…</span>
              </div>
            ) : (
              <img
                src={buildCheckInQrUrl(booking.checkInCode!, 240)}
                alt="Kelish QR kodi"
                className="size-full rounded-2xl object-contain p-2"
              />
            )}
          </div>
        </div>

        <div className="w-full text-center">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Zaxira / og&apos;zaki kod
          </span>
          <div className="font-mono text-4xl font-bold tracking-[0.35em] text-foreground">
            {loading ? "————" : (booking.checkInShortCode ?? "----")}
          </div>
          <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
            {loading
              ? "Bir necha soniyada tayyor bo'ladi."
              : "Kod bir martalik. Skanerlashda muammo bo'lsa, shu kodni sartaroshga ayting."}
          </p>
        </div>
      </div>
    </section>
  );
}

function DesktopServiceTimer({ booking, compact }: { booking: BookingItem; compact?: boolean }) {
  const timer = useLiveBookingTimer(booking);
  const live = booking.status === "in_progress";
  const radius = compact ? 60 : 80;
  const stroke = compact ? 8 : 12;
  const c = 2 * Math.PI * radius;
  const size = radius * 2 + stroke * 2;
  const dashOffset = c * (1 - timer.progress / 100);

  return (
    <section
      className={cn(
        "rounded-[28px] p-8",
        compact ? "bg-card ring-1 ring-border/60" : "bg-emerald-950 text-white",
      )}
    >
      {!compact ? (
        <span className="mb-6 block text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">
          {live ? "Xizmat davom etmoqda" : "Xizmat yakunlandi — jami vaqt"}
        </span>
      ) : null}

      <div className="flex flex-col items-center gap-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={compact ? "var(--border)" : "rgba(255,255,255,0.12)"}
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={compact ? "rgb(16 185 129)" : "white"}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "font-mono font-bold tabular-nums",
                compact ? "text-xl text-foreground" : "text-4xl text-white xl:text-5xl",
              )}
            >
              {timer.elapsedLabel}
            </span>
            {live ? (
              <span
                className={cn("mt-1 text-sm", compact ? "text-muted-foreground" : "text-white/60")}
              >
                −{timer.remainingLabel}
              </span>
            ) : null}
          </div>
        </div>
        {compact ? (
          <p className="text-xs text-muted-foreground">
            Rejalashtirilgan: {booking.duration} daqiqa
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DesktopBookingSummary({ booking }: { booking: BookingItem }) {
  const { dateLabel, timeLabel } = formatBookingLabels(booking);
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
    <section className="rounded-[28px] bg-card p-7 ring-1 ring-border/60">
      <div className="mb-5 flex items-center gap-4 border-b border-border/60 pb-5">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted text-foreground">
          <Scissors className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{booking.salonName}</h3>
          <p className="text-xs text-muted-foreground">{booking.barberName}</p>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{i === 0 ? "Xizmat" : line.service_name}</dt>
            <dd className="min-w-0 truncate text-right font-medium">
              {i === 0 ? line.service_name : `${line.duration_minutes} daq`}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Davomiyligi</dt>
          <dd className="font-medium">{booking.duration} daqiqa</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Sana</dt>
          <dd className="font-medium">{dateLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Vaqt</dt>
          <dd className="font-medium tabular-nums">{timeLabel}</dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-5">
        <span className="text-sm font-semibold">Jami</span>
        <span className="text-lg font-bold tracking-tight tabular-nums">
          {formatPrice(booking.price)}
        </span>
      </div>
    </section>
  );
}

function DesktopOrderBanner({ orderNumber }: { orderNumber?: string }) {
  if (!orderNumber) return null;
  return (
    <section className="rounded-[24px] bg-foreground p-5 text-background ring-1 ring-border/40">
      <div className="flex items-center gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-background/10">
          <Hash className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-background/50">
            Buyurtma raqami
          </p>
          <p className="font-mono text-lg font-bold tracking-wider">#{orderNumber}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-background/60">
        Yordam kerak bo&apos;lsa yoki sartaroshga qo&apos;ng&apos;iroq qilsangiz shu raqamni ayting.
      </p>
    </section>
  );
}

function DesktopCancelBanner({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  return (
    <section className="rounded-2xl border border-amber-300/40 bg-amber-50 p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Bekor qilish oynasi ochiq</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            5 daqiqa ichida bepul bekor qilish mumkin
          </p>
        </div>
        <span className="shrink-0 font-mono text-base font-bold tabular-nums text-amber-700">
          {formatCancelCountdown(left)}
        </span>
      </div>
    </section>
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
    <section className="overflow-hidden rounded-[24px] bg-card ring-1 ring-border/60">
      <div className="relative h-40 w-full bg-muted">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,oklch(0.96_0.01_285)_0%,oklch(0.92_0.02_285)_100%)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <div className="grid size-9 place-items-center rounded-full bg-foreground text-background ring-4 ring-background shadow-lg">
            <MapPin className="size-4" strokeWidth={2.5} />
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Manzil</h3>
            {address ? <p className="mt-1 text-sm text-muted-foreground">{address}</p> : null}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          <Navigation className="size-4" />
          Yo&apos;nalish olish
        </a>
      </div>
    </section>
  );
}

function DesktopPaymentCard({ booking }: { booking: BookingItem }) {
  const isCash = booking.paymentMethod === "cash" || !booking.paymentMethod;
  const paid = booking.paymentStatus === "paid" || !!booking.paidAt;

  return (
    <section className="rounded-[24px] bg-card p-6 ring-1 ring-border/60">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          To&apos;lov
        </h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
            paid
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
              : "bg-muted text-muted-foreground ring-border",
          )}
        >
          {paid ? "To'langan" : "To'lanmagan"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-muted">
          {isCash ? <Wallet className="size-5" /> : <CreditCard className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{isCash ? "Naqd pul" : "Onlayn to'lov"}</p>
          <p className="text-xs text-muted-foreground">
            {isCash ? "Salon kassiriga topshiring" : "Kartadan yechildi"}
          </p>
        </div>
        <p className="text-base font-bold tabular-nums">{formatPrice(booking.price)}</p>
      </div>
    </section>
  );
}

function DesktopTimelineCard({ booking }: { booking: BookingItem }) {
  return (
    <section className="rounded-[24px] bg-card p-6 ring-1 ring-border/60">
      <h3 className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Jarayon
      </h3>
      <BookingLifecycleTimeline status={booking.status} checkedIn={!!booking.checkedInAt} />
    </section>
  );
}

function LoadingBlock() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-destructive/10 px-6 py-5 text-sm text-destructive">
      {message}
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
    return (
      <div className="hidden min-h-[60vh] lg:block">
        <LoadingBlock />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="hidden lg:block">
        <ErrorBlock message={(error as Error).message} />
      </div>
    );
  }

  if (!booking) return null;

  const phase = getDesktopPhase(booking);
  const showQr = phase === "accepted_qr" || phase === "accepted_loading";
  const showMainTimer = phase === "in_progress" || phase === "done";
  const showCancelBanner =
    showCancel && cancelPolicy.secondsUntilCutoff != null && (phase === "pending" || showQr);
  const showPortfolio = phase === "checked_in" || phase === "in_progress" || phase === "done";

  return (
    <div className="hidden min-h-screen bg-background pb-16 lg:block">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1152px] items-center gap-3 px-8 py-4 xl:px-10">
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("bookings.title", { defaultValue: "Buyurtmalarim" })}
          </Link>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span>/</span>
            <span className="font-mono text-foreground">
              #{booking.orderNumber ?? booking.id.slice(0, 8)}
            </span>
          </div>
          <div className="ml-auto">
            <h1 className="text-sm font-semibold">
              {t("bookings.processTitle", { defaultValue: "Bron jarayoni" })}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1152px] px-8 py-10 xl:px-10">
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[1fr_380px] xl:gap-10">
          <div className="space-y-5">
            <DesktopBookingHero booking={booking} />

            {showQr ? <DesktopQrBlock booking={booking} /> : null}

            {showMainTimer ? <DesktopServiceTimer booking={booking} /> : null}

            {phase !== "cancelled" ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <DesktopPaymentCard booking={booking} />
                <DesktopAddressCard booking={booking} />
              </div>
            ) : null}

            {booking.status === "done" ? (
              <BookingBarberImpressions
                barberName={booking.barberName}
                kinds={booking.barberImpressions}
                className="rounded-[24px] bg-gradient-to-br from-emerald-600 to-emerald-950 p-6 text-white ring-0"
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
                className="block w-full max-w-sm rounded-2xl bg-foreground py-4 text-center text-sm font-semibold text-background"
              >
                Qayta bron qilish
              </Link>
            ) : null}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24">
            <DesktopBookingSummary booking={booking} />
            <DesktopOrderBanner orderNumber={booking.orderNumber} />

            {showCancelBanner ? (
              <DesktopCancelBanner seconds={cancelPolicy.secondsUntilCutoff!} />
            ) : (
              <CustomerCancelNotice booking={booking} variant="compact" />
            )}

            <BookingWaitCountdown booking={booking} />

            <DesktopTimelineCard booking={booking} />
            <BookingStatusHistory history={booking.statusHistory} />

            {phase === "in_progress" ? <DesktopServiceTimer booking={booking} compact /> : null}

            {booking.status !== "done" && booking.status !== "cancelled" ? (
              <div className="space-y-3">
                <BookingChatButton
                  barberId={booking.barberId}
                  className="w-full flex-none rounded-2xl bg-foreground py-4 text-sm font-semibold text-background"
                />
                {showCancel ? (
                  <button
                    type="button"
                    disabled={cancelMut.isPending}
                    onClick={onCancel}
                    className="w-full py-2 text-sm font-semibold text-destructive transition-colors hover:opacity-80 disabled:opacity-60"
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
      </main>
    </div>
  );
}
