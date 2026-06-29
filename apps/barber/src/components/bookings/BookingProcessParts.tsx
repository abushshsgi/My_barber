import { useEffect, useState } from "react";
import {
  buildLifecycleSteps,
  computeAppointmentCountdown,
  computeBookingTimer,
  formatHistoryWhen,
  paymentStatusLabel,
  type BookingLifecycleStatus,
} from "@mybarber/shared/booking-lifecycle";
import {
  Check,
  Circle,
  Clock3,
  History,
  MapPin,
  MessageSquare,
  Navigation,
  Users,
  Wallet,
} from "lucide-react";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { paymentBadgeClass, paymentLabel } from "@/lib/payment-label";
import { cn } from "@/lib/utils";

export function useLiveBookingTimer(booking: Pick<Booking, "status" | "started_at" | "end_at" | "start_at">) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (booking.status !== "in_progress") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking.status]);

  return computeBookingTimer({
    status: booking.status as BookingLifecycleStatus,
    startedAt: booking.started_at,
    endAt: booking.end_at,
    startAt: booking.start_at,
    now,
  });
}

export function BookingLifecycleTimeline({
  status,
  checkedIn = false,
}: {
  status: Booking["status"];
  checkedIn?: boolean;
}) {
  const steps = buildLifecycleSteps(status as BookingLifecycleStatus, checkedIn);

  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                step.state === "done" && "border-foreground bg-foreground text-background",
                step.state === "current" && "border-foreground bg-background text-foreground",
                step.state === "upcoming" && "border-border bg-muted text-muted-foreground",
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
                  "my-1 w-0.5 flex-1 min-h-6",
                  step.state === "done" ? "bg-foreground" : "bg-border",
                )}
              />
            ) : null}
          </div>
          <div className={cn("pb-6 min-w-0", i === steps.length - 1 && "pb-0")}>
            <p
              className={cn(
                "text-sm font-medium",
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
  booking: Pick<Booking, "status" | "started_at" | "end_at" | "start_at" | "duration_min">;
  className?: string;
}) {
  const timer = useLiveBookingTimer(booking);
  const showTimer = booking.status === "in_progress" || booking.status === "completed";

  if (!showTimer) return null;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timer.progress / 100) * circumference;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border border-border bg-gradient-to-b from-muted/40 to-card p-6",
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
          <span className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
            {timer.elapsedLabel}
          </span>
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
        Rejalashtirilgan davomiylik: {booking.duration_min} daqiqa
      </p>
    </div>
  );
}

export function BookingDetailSummary({ booking }: { booking: Booking }) {
  const lines = booking.lines?.length ? booking.lines : [{ service_name: booking.service, duration_minutes: booking.duration_min, price: booking.price }];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar src={booking.client_avatar} name={booking.client} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-semibold truncate">{booking.client}</p>
          {booking.salon_name ? (
            <p className="text-sm text-muted-foreground truncate">{booking.salon_name}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusPill status={booking.status} />
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                paymentBadgeClass(booking.payment_method),
              )}
            >
              {paymentLabel(booking.payment_method)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sana</p>
          <p className="mt-1 text-sm font-semibold">{booking.date}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vaqt</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{booking.time}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-3 col-span-2 sm:col-span-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Jami</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{formatUZS(booking.price)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Xizmatlar
        </div>
        <ul className="divide-y divide-border">
          {lines.map((line, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{line.service_name}</p>
                <p className="text-xs text-muted-foreground">{line.duration_minutes} daqiqa</p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatUZS(line.price)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BookingWaitCountdown({
  booking,
}: {
  booking: Pick<Booking, "status" | "start_at">;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (booking.status !== "pending" && booking.status !== "accepted") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking.status]);
  if (!booking.start_at || booking.status === "in_progress" || booking.status === "completed") {
    return null;
  }
  const cd = computeAppointmentCountdown(booking.start_at, now);
  if (!cd.isUpcoming) return null;
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        Bron vaqtigacha
      </p>
      <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-amber-950 dark:text-amber-100">
        {cd.label}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">qoldi</p>
    </div>
  );
}

export function BookingStatusHistory({ history }: { history: Booking["status_history"] }) {
  const rows = history ?? [];
  if (!rows.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-base font-semibold">
        <History className="size-4" />
        Tarix
      </h2>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={`${row.key}-${row.at}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatHistoryWhen(row.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BookingLocationCard({ booking }: { booking: Booking }) {
  const address = booking.salon_address?.trim();
  const lat = booking.salon_latitude;
  const lng = booking.salon_longitude;
  if (!address && (lat == null || lng == null)) return null;
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold">
        <MapPin className="size-4" />
        Manzil
      </h2>
      {address ? <p className="text-sm text-muted-foreground">{address}</p> : null}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
      >
        <Navigation className="size-4" />
        Yo'nalish olish
      </a>
    </div>
  );
}

export function BookingPaymentCard({ booking }: { booking: Booking }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold">
        <Wallet className="size-4" />
        To'lov
      </h2>
      <p className="text-sm font-medium">
        {paymentStatusLabel(booking.payment_method, booking.payment_status)}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{formatUZS(booking.price)}</p>
      {booking.paid_at ? (
        <p className="mt-1 text-xs text-muted-foreground">
          To'langan: {formatHistoryWhen(booking.paid_at)}
        </p>
      ) : null}
    </div>
  );
}

export function BookingOrderNumberBanner({ orderNumber }: { orderNumber?: string }) {
  if (!orderNumber) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Buyurtma raqami
        </p>
        <p className="mt-0.5 font-mono text-base font-semibold tracking-wide">{orderNumber}</p>
      </div>
      <p className="shrink-0 text-right text-[11px] text-muted-foreground">
        Support uchun
      </p>
    </div>
  );
}

export function BookingFamilyBanner({ name }: { name?: string | null }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
      <Users className="size-4 text-muted-foreground" />
      <span>
        Oilaviy bron: <strong>{name}</strong> uchun
      </span>
    </div>
  );
}

export function BookingResultPreview({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card overflow-hidden">
      <h2 className="mb-3 font-heading text-base font-semibold">Natija</h2>
      <img src={url} alt="Xizmat natijasi" className="w-full max-h-72 rounded-xl object-cover" />
    </div>
  );
}

export function BookingAddonHint({ onChat }: { onChat?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4">
      <p className="text-sm font-medium">Qo'shimcha xizmat kerakmi?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Mijoz bilan chat orqali kelishingiz va qo'shimcha xizmat qo'shishingiz mumkin.
      </p>
      {onChat ? (
        <button
          type="button"
          onClick={onChat}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <MessageSquare className="size-4" />
          Chatga yozish
        </button>
      ) : null}
    </div>
  );
}
