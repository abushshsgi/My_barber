import { useTranslation } from "react-i18next";

type Props = {
  seconds: number;
  busy?: boolean;
  idleLabel: string;
  onResend: () => void;
};

export function OtpResendTimer({ seconds, busy = false, idleLabel, onResend }: Props) {
  const { t } = useTranslation();
  const cooling = seconds > 0;

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
      className="flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-muted-foreground"
    >
      <span>{t("auth.resendCountdown")}</span>
      <span className="font-mono text-xs font-bold tabular-nums text-foreground">{display}</span>
    </p>
  );
}
