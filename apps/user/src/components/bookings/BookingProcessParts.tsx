import { useEffect, useRef, useState } from "react";
import {
  buildCheckInQrUrl,
  buildLifecycleSteps,
  computeAppointmentCountdown,
  computeBookingTimer,
  formatHistoryWhen,
  paymentStatusLabel,
  type BookingLifecycleStatus,
} from "@mybarber/shared/booking-lifecycle";
import { Camera, Check, Circle, Clock3, History, ImagePlus, Loader2, MapPin, MessageSquare, Navigation, QrCode, Scissors, Users, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BookingItem } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function toLifecycleStatus(status: BookingItem["status"]): BookingLifecycleStatus {
  if (status === "done") return "completed";
  return status;
}

export function useLiveBookingTimer(
  booking: Pick<BookingItem, "status" | "startedAt" | "endAt" | "date">,
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (booking.status !== "in_progress") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking.status]);

  return computeBookingTimer({
    status: toLifecycleStatus(booking.status),
    startedAt: booking.startedAt,
    endAt: booking.endAt,
    startAt: booking.date,
    now,
  });
}

export function BookingLifecycleTimeline({
  status,
  checkedIn = false,
}: {
  status: BookingItem["status"];
  checkedIn?: boolean;
}) {
  const steps = buildLifecycleSteps(toLifecycleStatus(status), checkedIn);

  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                step.state === "done" && "border-foreground bg-foreground text-background",
                step.state === "current" && "border-foreground bg-background text-foreground",
                step.state === "upcoming" && "border-border bg-surface text-muted-foreground",
                step.state === "skipped" && "border-transparent bg-transparent text-transparent",
              )}
            >
              {step.state === "done" ? (
                <Check className="size-4" strokeWidth={2.5} />
              ) : step.state === "current" ? (
                <Circle className="size-3 fill-current" />
              ) : step.state === "upcoming" ? (
                <span className="size-2 rounded-full bg-muted-foreground/40" />
              ) : null}
            </span>
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "my-1 min-h-6 w-0.5 flex-1",
                  step.state === "done" ? "bg-foreground" : "bg-border",
                )}
              />
            ) : null}
          </div>
          <div className={cn("min-w-0 pb-6", i === steps.length - 1 && "pb-0")}>
            <p
              className={cn(
                "text-sm font-semibold",
                step.state === "current" && "text-foreground",
                step.state === "done" && "text-foreground",
                step.state === "upcoming" && "text-muted-foreground",
                step.state === "skipped" && "text-muted-foreground/50 line-through",
              )}
            >
              {step.label}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function BookingServiceTimer({
  booking,
  className,
}: {
  booking: Pick<BookingItem, "status" | "startedAt" | "endAt" | "date" | "duration">;
  className?: string;
}) {
  const timer = useLiveBookingTimer(booking);
  const showTimer = booking.status === "in_progress" || booking.status === "done";

  if (!showTimer) return null;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timer.progress / 100) * circumference;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-[24px] border border-border bg-gradient-to-b from-surface to-background p-6",
        className,
      )}
    >
      <div className="relative size-36">
        <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-foreground transition-[stroke-dashoffset] duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock3 className="mb-1 size-4 text-muted-foreground" />
          <span className="text-3xl font-bold tabular-nums tracking-tight">{timer.elapsedLabel}</span>
          {timer.isRunning ? (
            <span className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              −{timer.remainingLabel} qoldi
            </span>
          ) : (
            <span className="mt-0.5 text-xs text-muted-foreground">Jami vaqt</span>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Rejalashtirilgan: {booking.duration} daqiqa
      </p>
    </div>
  );
}

export function BookingDetailSummary({ booking }: { booking: BookingItem }) {
  const { t } = useTranslation();
  const d = new Date(booking.date);
  const dateStr = d.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const lines = booking.lines?.length
    ? booking.lines
    : [{ service_name: booking.serviceName, duration_minutes: booking.duration, price: booking.price }];

  const statusStyles: Record<BookingItem["status"], string> = {
    pending: "bg-amber-100 text-amber-900",
    accepted: "bg-foreground text-background",
    in_progress: "bg-emerald-600 text-white",
    done: "border border-border bg-surface text-muted-foreground",
    cancelled: "border border-border bg-surface text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{
            background: `linear-gradient(160deg, oklch(0.88 0.04 ${(Number(booking.salonId || booking.barberId) * 80) % 360}), oklch(0.42 0.07 ${(Number(booking.salonId || booking.barberId) * 80 + 40) % 360}))`,
          }}
        >
          <Scissors className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{booking.salonName}</p>
          <p className="text-sm text-muted-foreground">
            {booking.serviceName} · {booking.barberName}
          </p>
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              statusStyles[booking.status],
            )}
          >
            {t(`bookings.status.${booking.status}`, { defaultValue: booking.status })}
          </span>
        </div>
      </div>

      {booking.bookedForName ? (
        <p className="text-xs font-semibold text-foreground">
          {t("family.bookFor", { name: booking.bookedForName, defaultValue: "{{name}} uchun" })}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Sana</p>
          <p className="mt-1 text-sm font-bold">{dateStr}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vaqt</p>
          <p className="mt-1 text-sm font-bold tabular-nums">{timeStr}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="border-b border-border bg-surface/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Xizmatlar
        </div>
        <ul className="divide-y divide-border">
          {lines.map((line, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-bold truncate">{line.service_name}</p>
                <p className="text-xs text-muted-foreground">{line.duration_minutes} daqiqa</p>
              </div>
              <span className="shrink-0 font-bold tabular-nums">{formatPrice(line.price)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border bg-surface/30 px-4 py-3">
          <span className="text-sm font-bold">Jami</span>
          <span className="text-sm font-bold tabular-nums">{formatPrice(booking.price)}</span>
        </div>
      </div>
    </div>
  );
}

export function BookingWaitCountdown({
  booking,
}: {
  booking: Pick<BookingItem, "status" | "date">;
}) {
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
    <div className="rounded-[24px] border border-amber-200/80 bg-amber-50/60 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Bron vaqtigacha</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-amber-950">{cd.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">qoldi</p>
    </div>
  );
}

export function BookingStatusHistory({
  history,
}: {
  history?: BookingItem["statusHistory"];
}) {
  const rows = history ?? [];
  if (!rows.length) return null;
  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
        <History className="size-4" />
        Tarix
      </h2>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={`${row.key}-${row.at}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">{row.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{formatHistoryWhen(row.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BookingLocationCard({ booking }: { booking: BookingItem }) {
  const address = booking.salonAddress?.trim();
  const lat = booking.salonLatitude;
  const lng = booking.salonLongitude;
  if (!address && (lat == null || lng == null)) return null;
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;
  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
        <MapPin className="size-4" />
        Manzil
      </h2>
      {address ? <p className="text-sm text-muted-foreground">{address}</p> : null}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-bold"
      >
        <Navigation className="size-4" />
        Yo'nalish olish
      </a>
    </div>
  );
}

export function BookingPaymentCard({ booking }: { booking: BookingItem }) {
  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
        <Wallet className="size-4" />
        To'lov
      </h2>
      <p className="text-sm font-semibold">
        {paymentStatusLabel(booking.paymentMethod, booking.paymentStatus)}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{formatPrice(booking.price)}</p>
      {booking.paidAt ? (
        <p className="mt-1 text-xs text-muted-foreground">To'langan: {formatHistoryWhen(booking.paidAt)}</p>
      ) : null}
    </div>
  );
}

export function BookingOrderNumberBanner({ orderNumber }: { orderNumber?: string }) {
  if (!orderNumber) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-[24px] border border-border bg-surface/50 p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Buyurtma raqami
        </p>
        <p className="mt-0.5 font-mono text-base font-bold tracking-wide">{orderNumber}</p>
      </div>
      <p className="shrink-0 text-right text-[11px] text-muted-foreground">
        Yordam uchun shu
        <br />
        raqamni ayting
      </p>
    </div>
  );
}

export function BookingQrCard({ token, shortCode }: { token: string; shortCode?: string }) {
  const qrUrl = buildCheckInQrUrl(token);
  return (
    <div className="rounded-[24px] border border-border bg-background p-5 text-center shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)] sm:col-span-2">
      <h2 className="mb-3 flex items-center justify-center gap-2 text-base font-bold">
        <QrCode className="size-4" />
        Kelish QR kodi
      </h2>
      <img
        src={qrUrl}
        alt="Kelish QR kodi"
        className="mx-auto size-48 rounded-2xl border border-border bg-white p-2"
      />
      {shortCode ? (
        <p className="mt-3 font-mono text-lg font-bold tracking-[0.3em]">{shortCode}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        Salon kelganingizda sartaroshga QR yoki yuqoridagi kodni ko'rsating. Kod bir martalik.
      </p>
    </div>
  );
}

export function BookingCheckInSection({ booking }: { booking: BookingItem }) {
  if (booking.status === "pending") {
    return (
      <div className="rounded-[24px] border border-dashed border-amber-200/80 bg-amber-50/40 p-5 text-center sm:col-span-2">
        <QrCode className="mx-auto mb-2 size-8 text-amber-800/70" />
        <p className="text-sm font-bold text-foreground">Kelish QR kodi</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sartarosh bronni tasdiqlagach, kelganingizda ko'rsatish uchun QR shu yerda paydo bo'ladi.
        </p>
      </div>
    );
  }

  if (booking.status === "accepted" && !booking.checkedInAt) {
    if (booking.checkInCode) {
      return <BookingQrCard token={booking.checkInCode} shortCode={booking.checkInShortCode} />;
    }
    return (
      <div className="flex flex-col items-center justify-center rounded-[24px] border border-border bg-background p-6 text-center sm:col-span-2">
        <Loader2 className="mb-2 size-7 animate-spin text-muted-foreground" />
        <p className="text-sm font-bold">QR tayyorlanmoqda…</p>
        <p className="mt-1 text-xs text-muted-foreground">Bir necha soniya kuting yoki sahifani yangilang.</p>
      </div>
    );
  }

  return null;
}

export function BookingPortfolioConsent({
  consent,
  onChange,
  busy,
}: {
  consent: boolean | null | undefined;
  onChange: (value: boolean) => void;
  busy?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
      <h2 className="text-base font-bold">Portfolio ruxsati</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Natija rasmingiz salon portfolio'sida ko'rinsinmi?
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy || consent === true}
          onClick={() => onChange(true)}
          className={cn(
            "flex-1 rounded-2xl py-3 text-sm font-bold",
            consent === true ? "bg-foreground text-background" : "border border-border",
          )}
        >
          Ruxsat beraman
        </button>
        <button
          type="button"
          disabled={busy || consent === false}
          onClick={() => onChange(false)}
          className={cn(
            "flex-1 rounded-2xl py-3 text-sm font-bold",
            consent === false ? "bg-muted text-foreground" : "border border-border",
          )}
        >
          Rad etaman
        </button>
      </div>
    </div>
  );
}

export function BookingPortfolioUpload({
  busy,
  onUpload,
}: {
  busy?: boolean;
  onUpload: (file: File) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
      <h2 className="text-base font-bold">Natija rasmini ulashing</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Siz portfolio uchun ruxsat berdingiz. Yangi obrazingiz rasmini joylashingiz mumkin.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-bold text-background disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Rasmga olish
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-bold disabled:opacity-60"
        >
          <ImagePlus className="size-4" />
          Galereyadan
        </button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={pick}
      />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

export function BookingResultPreview({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
      <h2 className="mb-3 text-base font-bold">Natija</h2>
      <img src={url} alt="Xizmat natijasi" className="max-h-72 w-full rounded-2xl object-cover" />
    </div>
  );
}

export function BookingAddonHint() {
  return (
    <div className="rounded-[24px] border border-dashed border-border bg-surface/40 p-4">
      <p className="text-sm font-bold">Qo'shimcha xizmat kerakmi?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Chat orqali sartarosh bilan kelishib, qo'shimcha xizmat so'rashingiz mumkin.
      </p>
      <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-foreground">
        <MessageSquare className="size-3.5" />
        Pastdagi Chat tugmasidan foydalaning
      </p>
    </div>
  );
}
