export type BookingLifecycleStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export type LifecycleStepId =
  | "requested"
  | "confirmed"
  | "checked_in"
  | "in_service"
  | "done";

export type LifecycleStepState = "done" | "current" | "upcoming" | "skipped";

export type LifecycleStep = {
  id: LifecycleStepId;
  label: string;
  state: LifecycleStepState;
};

const STEP_ORDER: LifecycleStepId[] = [
  "requested",
  "confirmed",
  "checked_in",
  "in_service",
  "done",
];

const STEP_LABELS: Record<LifecycleStepId, string> = {
  requested: "So'rov yuborildi",
  confirmed: "Tasdiqlandi",
  checked_in: "Mijoz keldi",
  in_service: "Xizmat davom etmoqda",
  done: "Yakunlandi",
};

function activeStepForStatus(
  status: BookingLifecycleStatus,
  checkedIn: boolean,
): LifecycleStepId | null {
  switch (status) {
    case "pending":
      return "requested";
    case "accepted":
      return checkedIn ? "checked_in" : "confirmed";
    case "in_progress":
      return "in_service";
    case "completed":
      return "done";
    default:
      return null;
  }
}

/** Barber va user panelida bir xil ko'rinishdagi jarayon bosqichlari. */
export function buildLifecycleSteps(
  status: BookingLifecycleStatus,
  checkedIn = false,
): LifecycleStep[] {
  const active = activeStepForStatus(status, checkedIn);
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

/** Yandex Go uslubidagi so'rovnoma o'lchovlari (backend `bookings/survey.py` bilan bir xil). */
export type SurveyTarget = "barber" | "salon";

export type SurveyDimension = {
  slug: string;
  label: string;
};

export const SURVEY_DIMENSIONS: Record<SurveyTarget, SurveyDimension[]> = {
  barber: [
    { slug: "politeness", label: "Sartarosh xushmuomalimi?" },
    { slug: "tool_cleanliness", label: "Asbob-uskunalar tozami?" },
    { slug: "skill", label: "Kasb mahorati qondirildimi?" },
  ],
  salon: [
    { slug: "atmosphere", label: "Atmosfera yoqdimi?" },
    { slug: "cleanliness", label: "Salon toza va hidi yaxshimi?" },
    { slug: "comfort", label: "Qulaylik darajasi qanday?" },
  ],
};

export const SURVEY_DIMENSION_LABELS: Record<string, string> = Object.values(
  SURVEY_DIMENSIONS,
)
  .flat()
  .reduce<Record<string, string>>((acc, item) => {
    acc[item.slug] = item.label;
    return acc;
  }, {});

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

/** QR payload prefiksi — skaner mijoz check-in tokenini tanib olishi uchun. */
export const CHECK_IN_QR_PREFIX = "mybarber:checkin:";

/** Mijoz check-in tokeni asosida QR rasm URL (sartarosh skaner qiladi). */
export function buildCheckInQrUrl(token: string, size = 200): string {
  const payload = `${CHECK_IN_QR_PREFIX}${token}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}

/**
 * Skaner natijasidan check-in tokenini ajratadi.
 * `mybarber:checkin:<token>` yoki to'g'ridan-to'g'ri token qabul qiladi.
 */
export function parseCheckInQrPayload(raw: string): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  if (value.startsWith(CHECK_IN_QR_PREFIX)) {
    const token = value.slice(CHECK_IN_QR_PREFIX.length).trim();
    return token || null;
  }
  // Eski QR formati yoki boshqa URL — token emas.
  if (value.includes("://") || value.includes(" ")) return null;
  return value;
}

export type CheckInResolveResult = { token?: string; short_code?: string };

const SHORT_CODE_RE = /^[A-Z0-9]{4,8}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{13,}$/;

function tryDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractFromUrl(value: string): CheckInResolveResult | null {
  if (!value.includes("?") && !value.includes("://")) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://x.invalid/?${value.replace(/^\?/, "")}`);
    for (const key of ["data", "token", "checkin", "code", "q"]) {
      const q = url.searchParams.get(key);
      if (q) {
        const nested = resolveCheckInPayload(q);
        if (nested) return nested;
      }
    }
  } catch {
    /* noop */
  }
  return null;
}

/**
 * QR skaner, qo'lda kod, tashqi barcode skaner — barcha formatlardan
 * check-in payload (`token` yoki `short_code`) ajratadi.
 */
export function resolveCheckInPayload(raw: string): CheckInResolveResult | null {
  let value = tryDecode((raw || "").trim().replace(/[\r\n]+$/g, ""));
  if (!value) return null;

  const prefixIdx = value.indexOf(CHECK_IN_QR_PREFIX);
  if (prefixIdx >= 0) {
    const token = value
      .slice(prefixIdx + CHECK_IN_QR_PREFIX.length)
      .trim()
      .split(/[\s?&#]/)[0];
    if (token) return { token };
  }

  const fromUrl = extractFromUrl(value);
  if (fromUrl) return fromUrl;

  const compact = value.replace(/[\s-]/g, "").toUpperCase();
  if (SHORT_CODE_RE.test(compact) && compact.length <= 8) {
    return { short_code: compact };
  }

  const tokenCandidate = value.split(/[\s?&#]/)[0];
  if (TOKEN_RE.test(tokenCandidate)) {
    return { token: tokenCandidate };
  }

  const legacy = parseCheckInQrPayload(value);
  if (legacy) {
    if (legacy.length > 12) return { token: legacy };
    if (SHORT_CODE_RE.test(legacy.toUpperCase())) return { short_code: legacy.toUpperCase() };
  }

  return null;
}

/** Buyurtma raqamini UI uchun normallashtiradi (katta harf, bo'shliqsiz). */
export function formatOrderNumber(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toUpperCase();
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
