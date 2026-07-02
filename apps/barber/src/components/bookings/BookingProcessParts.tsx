import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronRight,
  Circle,
  ClipboardList,
  Copy,
  History,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Receipt,
  Repeat,
  Scissors,
  StickyNote,
  Timer,
  Trophy,
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
} from "@mybarber/shared/booking-lifecycle";
import type { Booking } from "@/components/barber/BarberContext";
import { formatUZS } from "@/components/barber/BarberContext";
import { StatusPill, UserAvatar } from "@/components/barber/primitives";
import { paymentLabel } from "@/lib/payment-label";
import { formatUzPhoneDisplay, formatUzPhoneE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { BookingRouteMap } from "@/components/bookings/BookingRouteMap";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const STATUS_HERO: Record<
  Booking["status"],
  { icon: typeof Timer; label: string }
> = {
  pending: {
    icon: CalendarClock,
    label: "Yangi so'rov — javob bering",
  },
  accepted: {
    icon: BadgeCheck,
    label: "Tasdiqlangan — mijozni kuting",
  },
  in_progress: {
    icon: Scissors,
    label: "Xizmat davom etmoqda",
  },
  completed: {
    icon: Trophy,
    label: "Xizmat yakunlandi",
  },
  cancelled: {
    icon: ClipboardList,
    label: "Bron bekor qilindi",
  },
  rejected: {
    icon: ClipboardList,
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
              <span
                className={cn(
                  "mx-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  step.state === "done" && "border-foreground bg-foreground text-background",
                  step.state === "current" && "border-foreground bg-foreground text-background",
                  step.state === "upcoming" && "border-border bg-muted text-muted-foreground",
                  step.state === "skipped" && "border-transparent bg-transparent opacity-0",
                )}
              >
                {step.state === "done" ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : step.state === "current" ? (
                  <span className="size-2 rounded-full bg-background" />
                ) : step.state === "upcoming" ? (
                  <Circle className="size-1.5 fill-current" />
                ) : null}
              </span>
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
            className="text-foreground transition-[stroke-dashoffset] duration-1000 ease-out"
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

function ClientVisitBadge({ visits }: { visits: number }) {
  const label =
    visits <= 0
      ? "Yangi mijoz"
      : visits === 1
        ? "1 marta kelgan"
        : `${visits} marta kelgan`;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background">
      <Repeat className="size-3" />
      {label}
    </span>
  );
}

export function BookingDetailSummary({
  booking,
  clientVisits,
  clientQuery,
  onChat,
}: {
  booking: Booking;
  clientVisits?: number;
  clientQuery?: string;
  onChat?: () => void;
}) {
  const hero = STATUS_HERO[booking.status];
  const HeroIcon = hero.icon;
  const lines = booking.lines?.length
    ? booking.lines
    : [{ service_name: booking.service, duration_minutes: booking.duration_min, price: booking.price }];

  const serviceSummary = lines.map((l) => l.service_name).join(", ");
  const showVisitBadge = typeof clientVisits === "number";
  const profileQuery = clientQuery?.trim();
  const phone = booking.client_phone?.trim();
  const phoneE164 = phone ? formatUzPhoneE164(phone) : null;

  return (
    <ProcessCard delay={0.05}>
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
            <HeroIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold">{hero.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {booking.date} · <span className="tabular-nums">{booking.time}</span>
              {booking.salon_name ? ` · ${booking.salon_name}` : ""}
            </p>
          </div>
        </div>
        <StatusPill status={booking.status} className="shrink-0" />
      </div>

      <div className="mt-4 flex items-start gap-3">
        <UserAvatar src={booking.client_avatar} name={booking.client} className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          {profileQuery ? (
            <Link
              to="/barber/clients"
              search={{ q: profileQuery }}
              className="group inline-flex min-w-0 max-w-full items-center gap-1 font-heading text-base font-semibold transition-colors hover:text-foreground/70"
            >
              <span className="truncate">{booking.client}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <p className="truncate font-heading text-base font-semibold">{booking.client}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {showVisitBadge ? <ClientVisitBadge visits={clientVisits as number} /> : null}
            {phone ? (
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatUzPhoneDisplay(phone)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {phoneE164 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`tel:${phoneE164}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/70"
          >
            <Phone className="size-3.5" />
            Qo&apos;ng&apos;iroq
          </a>
          <a
            href={`sms:${phoneE164}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/70"
          >
            <MessageSquare className="size-3.5" />
            SMS
          </a>
          {onChat ? (
            <button
              type="button"
              onClick={onChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <MessageSquare className="size-3.5" />
              Chat
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-muted/30 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{serviceSummary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {booking.duration_min} daq · {paymentLabel(booking.payment_method)}
          </p>
          {lines.length > 1 ? (
            <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
              {lines.map((line, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{line.service_name}</span>
                  <span className="shrink-0 tabular-nums">
                    {line.duration_minutes} daq · {formatUZS(line.price)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="shrink-0 font-heading text-xl font-semibold tabular-nums">{formatUZS(booking.price)}</p>
      </div>
    </ProcessCard>
  );
}

export function BookingContactRow({
  phone,
  onChat,
}: {
  phone?: string | null;
  onChat?: () => void;
}) {
  if (!phone) return null;
  const e164 = formatUzPhoneE164(phone);
  const actions = [
    { icon: Phone, label: "Qo'ng'iroq", href: `tel:${e164}` },
    { icon: MessageSquare, label: "SMS", href: `sms:${e164}` },
  ];
  return (
    <ProcessCard delay={0.06} className="!p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Telefon
          </p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">{formatUzPhoneDisplay(phone)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((a) => (
            <a
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              <a.icon className="size-3.5" />
              {a.label}
            </a>
          ))}
          {onChat ? (
            <button
              type="button"
              onClick={onChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <MessageSquare className="size-3.5" />
              Chat
            </button>
          ) : null}
        </div>
      </div>
    </ProcessCard>
  );
}

export function BookingNotesCard({ notes }: { notes?: string }) {
  const text = notes?.trim();
  if (!text) return null;
  return (
    <ProcessCard delay={0.07}>
      <SectionTitle icon={StickyNote}>Mijoz izohi</SectionTitle>
      <p className="whitespace-pre-line rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
        {text}
      </p>
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

export function BookingStatusHistory({
  history,
  className,
}: {
  history: Booking["status_history"];
  className?: string;
}) {
  const rows = history ?? [];
  if (!rows.length) return null;
  return (
    <ProcessCard delay={0.1} className={className}>
      <SectionTitle icon={History}>Tarix</SectionTitle>
      <ol className="relative mt-1">
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          return (
            <li key={`${row.key}-${row.at}`} className="relative flex gap-3 pb-3 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute bottom-0 left-[5px] top-2.5 w-px bg-border"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] mt-1.5 size-2.5 shrink-0 rounded-full ring-2 ring-card",
                  i === rows.length - 1 ? "bg-foreground" : "bg-muted-foreground/40",
                )}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                <span className="text-sm font-medium leading-snug">{row.label}</span>
                <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {formatHistoryWhen(row.at)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
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
              ? "bg-foreground text-background"
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
    <ProcessCard delay={0.08} className="!py-4">
      <BookingLifecycleTimeline status={status} checkedIn={checkedIn} />
    </ProcessCard>
  );
}

export function BookingResultPreview({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <ProcessCard delay={0.14} className="overflow-hidden">
      <SectionTitle icon={ImageIcon}>Natija</SectionTitle>
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
    <ProcessCard delay={0.13} className="bg-muted/20">
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
