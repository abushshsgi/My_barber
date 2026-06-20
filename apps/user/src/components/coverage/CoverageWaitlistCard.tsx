import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { submitLaunchInterest } from "@/lib/api/geo";
import { cn } from "@/lib/utils";

type Props = {
  region: string;
  lat?: number | null;
  lng?: number | null;
  cityLabel?: string;
  source: "onboarding" | "address" | "home";
  onSubmitted?: () => void;
  className?: string;
};

export function CoverageWaitlistCard({
  region,
  lat,
  lng,
  cityLabel,
  source,
  onSubmitted,
  className,
}: Props) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await submitLaunchInterest({
        region,
        latitude: lat ?? null,
        longitude: lng ?? null,
        city_label: cityLabel ?? "",
        message: message.trim(),
        source,
      });
      setSubmitted(true);
      onSubmitted?.();
      toast.success(t("coverage.notifySuccess"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.loadError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4",
        className,
      )}
    >
      <p className="text-sm font-bold">{t("coverage.comingSoon")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("coverage.comingSoonHint")}</p>
      {submitted ? (
        <p className="mt-3 text-xs font-semibold text-foreground">{t("coverage.thanks")}</p>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder={t("coverage.messagePlaceholder")}
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:border-foreground focus:outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSubmit()}
            className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-xs font-bold text-background disabled:opacity-60"
          >
            {busy ? t("common.loading") : t("coverage.notify")}
          </button>
        </>
      )}
    </div>
  );
}
