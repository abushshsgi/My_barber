import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  seconds: number;
};

export function OtpResendTimer({ seconds }: Props) {
  const { t } = useTranslation();

  if (seconds <= 0) return null;

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const display = minutes > 0 ? `${minutes}:${String(remainder).padStart(2, "0")}` : String(seconds);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-4 rounded-2xl border-2 border-amber-300/70 bg-amber-50 px-4 py-4 dark:border-amber-500/40 dark:bg-amber-950/40"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-amber-400/80 bg-background">
        <span className="font-mono text-lg font-bold tabular-nums text-amber-900 dark:text-amber-100">
          {display}
        </span>
      </div>
      <div className="min-w-0 text-left">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {t("auth.resendTimerLabel")}
        </p>
        <p className="mt-1 text-sm font-bold text-amber-950 dark:text-amber-50">
          {t("auth.resendTimerHint", { seconds })}
        </p>
      </div>
    </div>
  );
}
