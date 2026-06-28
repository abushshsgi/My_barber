export type BookingLifecycleStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export type LifecycleStepId = "requested" | "confirmed" | "in_service" | "done";

export type LifecycleStepState = "done" | "current" | "upcoming" | "skipped";

export type LifecycleStep = {
  id: LifecycleStepId;
  label: string;
  state: LifecycleStepState;
};

const STEP_ORDER: LifecycleStepId[] = ["requested", "confirmed", "in_service", "done"];

const STEP_LABELS: Record<LifecycleStepId, string> = {
  requested: "So'rov yuborildi",
  confirmed: "Tasdiqlandi",
  in_service: "Xizmat davom etmoqda",
  done: "Yakunlandi",
};

function activeStepForStatus(status: BookingLifecycleStatus): LifecycleStepId | null {
  switch (status) {
    case "pending":
      return "requested";
    case "accepted":
      return "confirmed";
    case "in_progress":
      return "in_service";
    case "completed":
      return "done";
    default:
      return null;
  }
}

/** Barber va user panelida bir xil ko'rinishdagi jarayon bosqichlari. */
export function buildLifecycleSteps(status: BookingLifecycleStatus): LifecycleStep[] {
  const active = activeStepForStatus(status);
  const isTerminal = status === "cancelled" || status === "rejected";

  return STEP_ORDER.map((id) => {
    const label =
      isTerminal && id === "requested" && status === "cancelled"
        ? "Bekor qilindi"
        : isTerminal && id === "requested" && status === "rejected"
          ? "Rad etildi"
          : STEP_LABELS[id];

    if (isTerminal) {
      return { id, label, state: id === "requested" ? "current" : "skipped" };
    }

    if (!active) {
      return { id, label, state: "upcoming" };
    }

    const activeIdx = STEP_ORDER.indexOf(active);
    const idx = STEP_ORDER.indexOf(id);
    if (idx < activeIdx) return { id, label, state: "done" };
    if (idx === activeIdx) return { id, label, state: "current" };
    return { id, label, state: "upcoming" };
  });
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type BookingTimerState = {
  isRunning: boolean;
  isComplete: boolean;
  elapsedMs: number;
  remainingMs: number;
  plannedMs: number;
  /** 0–100 */
  progress: number;
  elapsedLabel: string;
  remainingLabel: string;
};

export function computeBookingTimer(opts: {
  status: BookingLifecycleStatus;
  startedAt?: string | null;
  endAt?: string | null;
  startAt?: string | null;
  now?: number;
}): BookingTimerState {
  const now = opts.now ?? Date.now();
  const startAtMs = opts.startAt ? new Date(opts.startAt).getTime() : NaN;
  const endAtMs = opts.endAt ? new Date(opts.endAt).getTime() : NaN;
  const startedAtMs = opts.startedAt ? new Date(opts.startedAt).getTime() : NaN;

  const plannedMs =
    Number.isFinite(startAtMs) && Number.isFinite(endAtMs) && endAtMs > startAtMs
      ? endAtMs - startAtMs
      : 30 * 60_000;

  const isRunning = opts.status === "in_progress" && Number.isFinite(startedAtMs);
  const isComplete = opts.status === "completed";

  let elapsedMs = 0;
  if (isRunning) {
    elapsedMs = Math.max(0, now - startedAtMs);
  } else if (isComplete && Number.isFinite(startedAtMs)) {
    elapsedMs = Math.max(0, (Number.isFinite(endAtMs) ? endAtMs : now) - startedAtMs);
  }

  const remainingMs = isRunning ? Math.max(0, plannedMs - elapsedMs) : 0;
  const progress = plannedMs > 0 ? Math.min(100, Math.round((elapsedMs / plannedMs) * 100)) : 0;

  return {
    isRunning,
    isComplete,
    elapsedMs,
    remainingMs,
    plannedMs,
    progress,
    elapsedLabel: formatDurationMs(elapsedMs),
    remainingLabel: formatDurationMs(remainingMs),
  };
}

export function bookingNeedsLiveRefresh(status: BookingLifecycleStatus): boolean {
  return status === "pending" || status === "accepted" || status === "in_progress";
}

export type StatusHistoryEntry = {
  key: string;
  label: string;
  at: string;
};

export type AppointmentCountdown = {
  isUpcoming: boolean;
  isPast: boolean;
  totalMs: number;
  label: string;
};

export function computeAppointmentCountdown(
  startAt: string,
  now = Date.now(),
): AppointmentCountdown {
  const target = new Date(startAt).getTime();
  const diff = target - now;
  const abs = Math.abs(diff);
  const label = formatDurationMs(abs);
  if (diff > 0) {
    return { isUpcoming: true, isPast: false, totalMs: diff, label };
  }
  return { isUpcoming: false, isPast: true, totalMs: abs, label };
}

export function buildCheckInQrUrl(code: string, size = 180): string {
  const payload = `mybarber:booking:${code}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}

export function paymentStatusLabel(
  method: "cash" | "online" | string | undefined,
  status: string | undefined,
): string {
  if (method === "online") {
    if (status === "paid") return "Onlayn to'langan";
    if (status === "pending") return "Onlayn to'lov kutilmoqda";
    if (status === "refunded") return "Pul qaytarildi";
    return "Onlayn to'lov";
  }
  return "Naqd to'lov";
}

/** Xizmat tugaganda qisqa audio signal (brauzer ruxsati kerak bo'lishi mumkin). */
export function playBookingCompletionChime(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    )();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.4);
    void ctx.close();
  } catch {
    /* audio blocked */
  }
}

export function formatHistoryWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("uz-UZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
