import { useTranslation } from "react-i18next";
import { OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/api";

type Props = {
  seconds: number;
  busy?: boolean;
  idleLabel: string;
  onResend: () => void;
};

const RING_R = 13;
const RING_C = 2 * Math.PI * RING_R;

export function OtpResendTimer({ seconds, busy = false, idleLabel, onResend }: Props) {
  const { t } = useTranslation();
  const cooling = seconds > 0;
  const progress = cooling ? seconds / OTP_RESEND_COOLDOWN_SECONDS : 0;

  if (!cooling) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onResend}
        className="w-full text-center text-xs font-bold text-muted-foreground underline underline-offset-4 transition-opacity disabled:opacity-50"
      >
        {idleLabel}
      </button>
    );
  }

  const display =
    seconds >= 60
      ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
      : String(seconds);

  return (
    <p
      role="status"
      aria-live="polite"
      aria-label={t("auth.resendTimerHint", { seconds })}
      className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-muted-foreground"
    >
      <span>{t("auth.resendCountdown")}</span>
      <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center">
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 32 32"
          aria-hidden
        >
          <circle
            cx="16"
            cy="16"
            r={RING_R}
            fill="none"
            strokeWidth="2"
            className="stroke-border"
          />
          <circle
            cx="16"
            cy="16"
            r={RING_R}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-foreground transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
          />
        </svg>
        <span className="font-mono text-[10px] font-bold tabular-nums text-foreground">{display}</span>
      </span>
    </p>
  );
}
