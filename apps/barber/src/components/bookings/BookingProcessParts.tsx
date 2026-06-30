import { motion } from "framer-motion";
import {
  BadgeCheck,
  Calendar,
  CalendarClock,
  Check,
  Circle,
  ClipboardList,
  Clock3,
  Copy,
  History,
  MapPin,
  MessageSquare,
  Navigation,
  Receipt,
  Scissors,
  Sparkles,
  Timer,
  Trophy,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  buildLifecycleSteps,
  computeAppointmentCountdown,
  computeBookingTimer,
  formatHistoryWhen,
  paymentStatusLabel,
  type BookingLifecycleStatus,
  type LifecycleStepId,
} from "@mybarber/shared/booking-lifecycle";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { paymentBadgeClass, paymentLabel } from "@/lib/payment-label";
import { cn } from "@/lib/utils";
import { BookingRouteMap } from "@/components/bookings/BookingRouteMap";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const STEP_ICONS: Record<LifecycleStepId, typeof ClipboardList> = {
  requested: ClipboardList,
  confirmed: BadgeCheck,
  checked_in: UserCheck,
  in_service: Scissors,
  done: Trophy,
};

const STATUS_HERO: Record<
  Booking["status"],
  { icon: typeof Timer; gradient: string; ring: string; label: string }
> = {
  pending: {
    icon: CalendarClock,
    gradient: "from-amber-500/15 via-amber-400/5 to-card",
    ring: "ring-amber-400/30",
    label: "Yangi so'rov — javob bering",
  },
  accepted: {
    icon: BadgeCheck,
    gradient: "from-sky-500/15 via-sky-400/5 to-card",
    ring: "ring-sky-400/30",
    label: "Tasdiqlangan — mijozni kuting",
  },
  in_progress: {
    icon: Scissors,
    gradient: "from-emerald-500/15 via-emerald-400/5 to-card",
    ring: "ring-emerald-400/40",
    label: "Xizmat davom etmoqda",
  },
  completed: {
    icon: Trophy,
    gradient: "from-violet-500/12 via-violet-400/5 to-card",
    ring: "ring-violet-400/25",
    label: "Xizmat yakunlandi",
  },
  cancelled: {
    icon: ClipboardList,
    gradient: "from-muted/80 to-card",
    ring: "ring-border",
    label: "Bron bekor qilindi",
  },
  rejected: {
    icon: ClipboardList,
    gradient: "from-destructive/10 to-card",
    ring: "ring-destructive/20",
    label: "Bron rad etildi",
  },
};

function ProcessCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-2xl bg-card p-4 shadow-card sm:p-5",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof History;
  children: ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold">
      <span className="grid size-7 place-items-center rounded-lg bg-muted text-foreground">
        <Icon className="size-3.5" />
      </span>
      {children}
    </h2>
  );
}

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

export function BookingStatusHero({ booking }: { booking: Booking }) {
  const hero = STATUS_HERO[booking.status];
  const Icon = hero.icon;
  const pulse = booking.status === "pending" || booking.status === "in_progress";

  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 shadow-card sm:p-5",
        hero.gradient,
      )}
    >
      {pulse ? (
        <span className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-current opacity-[0.04] animate-pulse" />
      ) : null}
      <div className="relative flex items-start gap-3.5">
        <div className="relative shrink-0">
          {pulse ? (
            <span className="absolute inset-0 animate-ping rounded-2xl bg-foreground/10" />
          ) : null}
          <span className="relative grid size-11 place-items-center rounded-2xl bg-background/80 shadow-sm backdrop-blur-sm">
            <Icon className="size-6" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={booking.status} />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                paymentBadgeClass(booking.payment_method),
              )}
            >
              <Wallet className="size-3" />
              {paymentLabel(booking.payment_method)}
            </span>
          </div>
          <p className="mt-2 font-heading text-base font-semibold">{hero.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.date} · <span className="tabular-nums">{booking.time}</span>
            {booking.salon_name ? ` · ${booking.salon_name}` : ""}
          </p>
        </div>
      </div>
    </motion.div>
  );
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
    <motion.ol
      className="flex items-start justify-between gap-1"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {steps.map((step, i) => {
        const StepIcon = STEP_ICONS[step.id];
        const lineDone = step.state === "done";
        const nextStep = steps[i + 1];
        const nextLineActive =
          nextStep && (nextStep.state === "done" || nextStep.state === "current");

        return (
          <motion.li
            key={step.id}
            variants={fadeUp}
            className="flex min-w-0 flex-1 flex-col items-center"
          >
            <div className="flex w-full items-center">
              {i > 0 ? (
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    lineDone ? "bg-foreground" : "bg-border",
                  )}
                />
              ) : (
                <span className="flex-1" />
              )}
              <motion.span
                layout
                className={cn(
                  "mx-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  step.state === "done" && "border-foreground bg-foreground text-background",
                  step.state === "current" &&
                    "border-foreground bg-background text-foreground shadow-sm",
                  step.state === "upcoming" && "border-border bg-muted text-muted-foreground",
                  step.state === "skipped" && "border-transparent bg-transparent opacity-0",
                )}
                animate={step.state === "current" ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={
                  step.state === "current"
                    ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
              >
                {step.state === "done" ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : step.state === "current" ? (
                  <StepIcon className="size-3.5" />
                ) : step.state === "upcoming" ? (
                  <Circle className="size-1.5 fill-current" />
                ) : null}
              </motion.span>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    nextLineActive ? "bg-foreground" : "bg-border",
                  )}
                />
              ) : (
                <span className="flex-1" />
              )}
            </div>
            <p
              className={cn(
                "mt-2 px-0.5 text-center text-[10px] font-medium leading-tight sm:text-xs",
                step.state === "current" && "text-foreground",
                step.state === "done" && "text-foreground",
                step.state === "upcoming" && "text-muted-foreground",
                step.state === "skipped" && "text-muted-foreground/40 line-through",
              )}
            >
              {step.label}
            </p>
          </motion.li>
        );
      })}
    </motion.ol>
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
    <ProcessCard className={cn("flex flex-col items-center", className)} delay={0.08}>
      <div className="relative size-28">
        <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-foreground"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Timer className="mb-0.5 size-3.5 text-muted-foreground" />
          <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
            {timer.elapsedLabel}
          </span>
          {timer.isRunning ? (
            <span className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              −{timer.remainingLabel} qoldi
            </span>
          ) : (
            <span className="mt-0.5 text-xs text-muted-foreground">Jami vaqt</span>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Rejalashtirilgan: {booking.duration_min} daqiqa
      </p>
    </ProcessCard>
  );
}

export function BookingDetailSummary({ booking }: { booking: Booking }) {
  const lines = booking.lines?.length
    ? booking.lines
    : [{ service_name: booking.service, duration_minutes: booking.duration_min, price: booking.price }];

  const serviceSummary = lines.map((l) => l.service_name).join(", ");

  return (
    <ProcessCard delay={0.05}>
      <div className="flex items-start gap-3.5">
        <UserAvatar src={booking.client_avatar} name={booking.client} className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-lg font-semibold truncate">{booking.client}</p>
            <StatusPill status={booking.status} className="shrink-0" />
          </div>
          {booking.client_phone ? (
            <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{booking.client_phone}</p>
          ) : null}
          {booking.salon_name ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground truncate">
              <Sparkles className="size-3.5 shrink-0" />
              {booking.salon_name}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Calendar className="size-3.5 text-muted-foreground" />
          {booking.date}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
          <Clock3 className="size-3.5 text-muted-foreground" />
          {booking.time}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{booking.duration_min} daq</span>
        {booking.payment_method ? (
          <>
            <span className="text-muted-foreground">·</span>
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                paymentBadgeClass(booking.payment_method),
              )}
            >
              {paymentLabel(booking.payment_method)}
            </span>
          </>
        ) : null}
        <span className="ml-auto font-heading text-base font-semibold tabular-nums">
          {formatUZS(booking.price)}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-muted/25 px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Xizmat</p>
        <p className="mt-1 text-sm font-medium">{serviceSummary}</p>
        {lines.length === 1 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lines[0].duration_minutes} daqiqa · {formatUZS(lines[0].price)}
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {lines.map((line, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{line.service_name}</span>
                <span className="shrink-0 tabular-nums">
                  {line.duration_minutes} daq · {formatUZS(line.price)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProcessCard>
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
    <ProcessCard delay={0.1} className="bg-foreground text-background">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-background/70">
        <CalendarClock className="size-4" />
        Bron vaqtigacha
      </p>
      <motion.p
        key={cd.label}
        initial={{ opacity: 0.7, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-2 font-heading text-3xl font-semibold tabular-nums tracking-tight"
      >
        {cd.label}
      </motion.p>
      <p className="mt-1 text-xs text-background/60">qoldi</p>
    </ProcessCard>
  );
}

export function BookingStatusHistory({ history }: { history: Booking["status_history"] }) {
  const rows = history ?? [];
  if (!rows.length) return null;
  return (
    <ProcessCard delay={0.15}>
      <SectionTitle icon={History}>Tarix</SectionTitle>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <motion.li
            key={`${row.key}-${row.at}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm"
          >
            <span className="font-medium">{row.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatHistoryWhen(row.at)}
            </span>
          </motion.li>
        ))}
      </ul>
    </ProcessCard>
  );
}

export function BookingLocationCard({ booking }: { booking: Booking }) {
  const address = booking.salon_address?.trim();
  const lat = booking.salon_latitude;
  const lng = booking.salon_longitude;
  if (!address && (lat == null || lng == null)) return null;

  const hasCoords = lat != null && lng != null;

  return (
    <ProcessCard delay={0.12}>
      <SectionTitle icon={MapPin}>Manzil</SectionTitle>
      {hasCoords ? (
        <BookingRouteMap
          lat={lat}
          lng={lng}
          address={address}
          salonName={booking.salon_name}
        />
      ) : (
        <div className="space-y-3">
          {address ? <p className="text-sm text-muted-foreground">{address}</p> : null}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Navigation className="size-4" />
            Yo'nalish olish
          </a>
        </div>
      )}
    </ProcessCard>
  );
}

export function BookingPaymentCard({ booking }: { booking: Booking }) {
  return (
    <ProcessCard delay={0.09}>
      <SectionTitle icon={Wallet}>To'lov</SectionTitle>
      <p className="text-sm font-medium">
        {paymentStatusLabel(booking.payment_method, booking.payment_status)}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{formatUZS(booking.price)}</p>
      {booking.paid_at ? (
        <p className="mt-1 text-xs text-muted-foreground">
          To'langan: {formatHistoryWhen(booking.paid_at)}
        </p>
      ) : null}
    </ProcessCard>
  );
}

export function BookingOrderNumberBanner({ orderNumber }: { orderNumber?: string }) {
  const [copied, setCopied] = useState(false);
  if (!orderNumber) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <ProcessCard delay={0.07} className="!p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="size-3.5" />
            Buyurtma raqami
          </p>
          <p className="mt-1 font-mono text-base font-semibold tracking-wide">{orderNumber}</p>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
            copied
              ? "bg-emerald-50 text-emerald-700"
              : "bg-muted/50 hover:bg-muted",
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Nusxalandi" : "Nusxalash"}
        </button>
      </div>
    </ProcessCard>
  );
}

export function BookingProcessSection({
  status,
  checkedIn = false,
}: {
  status: Booking["status"];
  checkedIn?: boolean;
}) {
  return (
    <ProcessCard delay={0.12}>
      <h2 className="mb-3 font-heading text-base font-semibold">Jarayon</h2>
      <BookingLifecycleTimeline status={status} checkedIn={checkedIn} />
    </ProcessCard>
  );
}

export function BookingResultPreview({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <ProcessCard delay={0.14} className="overflow-hidden">
      <SectionTitle icon={Sparkles}>Natija</SectionTitle>
      <motion.img
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        src={url}
        alt="Xizmat natijasi"
        className="max-h-72 w-full rounded-xl object-cover"
      />
    </ProcessCard>
  );
}

export function BookingAddonHint({ onChat }: { onChat?: () => void }) {
  return (
    <ProcessCard delay={0.13} className="border-dashed bg-muted/10">
      <p className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="size-4 text-muted-foreground" />
        Qo'shimcha xizmat kerakmi?
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Mijoz bilan chat orqali kelishingiz va qo'shimcha xizmat qo'shishingiz mumkin.
      </p>
      {onChat ? (
        <button
          type="button"
          onClick={onChat}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          <MessageSquare className="size-4" />
          Chatga yozish
        </button>
      ) : null}
    </ProcessCard>
  );
}
