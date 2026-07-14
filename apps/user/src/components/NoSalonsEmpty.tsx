import { Link } from "@tanstack/react-router";
import { Compass, Store, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
  /** Override title — default: Hozircha salonlar yo'q */
  titleKey?: string;
  /** Override description */
  descriptionKey?: string;
  centered?: boolean;
  /** Xarita uchun — Morf AI / trend CTA larsiz */
  hideStyleCtas?: boolean;
};

/**
 * Salonlar yo'q (yoki filtrlarda topilmadi).
 * `hideStyleCtas` — map/xarita overlay (faqat matn).
 */
export function NoSalonsEmpty({
  className,
  compact = false,
  titleKey = "homePage.noSalonsYet",
  descriptionKey = "homePage.noSalonsYetHint",
  centered = false,
  hideStyleCtas = false,
}: Props) {
  const { t } = useTranslation();
  const mapHintKey = hideStyleCtas ? "homePage.noSalonsMapHint" : descriptionKey;

  const actions = hideStyleCtas ? undefined : (
    <div className={cn("flex w-full flex-col gap-2 sm:flex-row sm:justify-center", compact && "gap-1.5")}>
      <Link
        to="/ai-style"
        preload="intent"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-5 font-bold text-background transition active:scale-[0.98]",
          compact ? "py-2.5 text-xs" : "py-3 text-sm",
        )}
      >
        <Wand2 className={compact ? "size-3.5" : "size-4"} strokeWidth={2.2} />
        {t("homePage.tryMorphAi")}
      </Link>
      <Link
        to="/explore"
        preload="intent"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 font-bold transition active:scale-[0.98]",
          compact ? "py-2.5 text-xs" : "py-3 text-sm",
        )}
      >
        <Compass className={compact ? "size-3.5" : "size-4"} strokeWidth={2.2} />
        {t("homePage.browseStyles")}
      </Link>
    </div>
  );

  if (compact) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-surface px-4 py-6 text-center",
          className,
        )}
      >
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-foreground/5">
          <Store className="size-5 text-foreground" strokeWidth={1.8} />
        </div>
        <p className="mt-3 text-sm font-bold tracking-tight">{t(titleKey)}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(mapHintKey)}</p>
        {actions ? <div className="mt-4">{actions}</div> : null}
      </div>
    );
  }

  return (
    <PageSpotlightEmpty
      icon={Store}
      title={t(titleKey)}
      description={t(mapHintKey)}
      action={actions}
      tone="warm"
      borderless
      centered={centered}
      className={className}
    />
  );
}
