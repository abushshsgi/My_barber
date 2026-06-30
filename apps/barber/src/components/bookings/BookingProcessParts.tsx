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
  Users,
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
    <motion.ol className="space-y-0" variants={stagger} initial="initial" animate="animate">
      {steps.map((step, i) => {
        const StepIcon = STEP_ICONS[step.id];
        return (
          <motion.li key={step.id} variants={fadeUp} className="flex gap-3">
            <div className="flex flex-col items-center">
              <motion.span
                layout
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  step.state === "done" && "border-foreground bg-foreground text-background",
                  step.state === "current" && "border-foreground bg-background text-foreground shadow-sm",
                  step.state === "upcoming" && "border-border bg-muted text-muted-foreground",
                  step.state === "skipped" && "border-transparent bg-transparent text-transparent",
                )}
                animate={step.state === "current" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={
                  step.state === "current"
                    ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
              >
                {step.state === "done" ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : step.state === "current" ? (
                  <StepIcon className="size-4" />
                ) : step.state === "upcoming" ? (
                  <Circle className="size-2 fill-current" />
                ) : null}
              </motion.span>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "my-1 min-h-4 w-0.5 flex-1 rounded-full transition-colors",
                    step.state === "done" ? "bg-foreground" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div className={cn("min-w-0 pb-4", i === steps.length - 1 && "pb-0")}>
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

  return (
    <ProcessCard delay={0.05}>
      <div className="flex items-center gap-3.5">
        <UserAvatar src={booking.client_avatar} name={booking.client} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-semibold truncate">{booking.client}</p>
          {booking.salon_name ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground truncate">
              <Sparkles className="size-3.5 shrink-0" />
              {booking.salon_name}
            </p>
          ) : null}
          {booking.client_phone ? (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{booking.client_phone}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { icon: Calendar, label: "Sana", value: booking.date },
          { icon: Clock3, label: "Vaqt", value: booking.time },
          { icon: Receipt, label: "Jami", value: formatUZS(booking.price) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-muted/40 p-2.5 transition-colors hover:bg-muted/60"
          >
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <item.icon className="size-3" />
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl bg-muted/20">
        <div className="flex items-center gap-2 bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Scissors className="size-3.5" />
          Xizmatlar
        </div>
        <ul className="divide-y divide-border">
          {lines.map((line, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{line.service_name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="size-3" />
                  {line.duration_minutes} daqiqa
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatUZS(line.price)}</span>
            </motion.li>
          ))}
        </ul>
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
    <ProcessCard delay={0.1} className="bg-gradient-to-br from-amber-50/80 to-card dark:from-amber-950/20">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        <CalendarClock className="size-4" />
        Bron vaqtigacha
      </p>
      <motion.p
        key={cd.label}
        initial={{ opacity: 0.6, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-1.5 font-heading text-2xl font-semibold tabular-nums text-amber-950 dark:text-amber-100"
      >
        {cd.label}
      </motion.p>
      <p className="mt-1 text-xs text-muted-foreground">qoldi</p>
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
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;
  return (
    <ProcessCard delay={0.12}>
      <SectionTitle icon={MapPin}>Manzil</SectionTitle>
      <div className="flex items-center justify-between gap-3">
        {address ? (
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">{address}</p>
        ) : (
          <span className="flex-1" />
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Navigation className="size-4" />
          Yo'nalish olish
        </a>
      </div>
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

export function BookingFamilyBanner({ name }: { name?: string | null }) {
  if (!name) return null;
  return (
    <motion.div
      {...fadeUp}
      className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-violet-500/10 to-card px-3.5 py-2.5 text-sm shadow-sm"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
        <Users className="size-4" />
      </span>
      <span className="min-w-0 flex-1 self-center">
        Oilaviy bron: <strong className="break-words">{name}</strong> uchun
      </span>
    </motion.div>
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
