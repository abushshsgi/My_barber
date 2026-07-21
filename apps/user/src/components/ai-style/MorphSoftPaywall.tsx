import { Link } from "@tanstack/react-router";
import { Crown, Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MorphPromoUrgencyBanner } from "@/components/subscriptions/MorphPromoUrgencyBanner";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Blurred preview image (optional). */
  previewUrl?: string | null;
};

/**
 * Soft paywall — blur preview + muddatli promo urgency.
 */
export function MorphSoftPaywall({ className, previewUrl }: Props) {
  const { t } = useTranslation();

  return (
    <section className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-[24px] border border-border bg-foreground text-background">
        <div className="relative min-h-[160px]">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50 blur-md"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/80 to-foreground/40" />

          <div className="relative flex flex-col items-center px-5 py-7 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-background/20 bg-background/10">
              <Lock className="size-5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-background/50">
              Morph AI
            </p>
            <h3 className="mt-1.5 max-w-sm text-lg font-bold leading-snug tracking-tight">
              {t("aiStylePage.softPaywall.title", {
                defaultValue: "To‘liq ko‘rish uchun oching",
              })}
            </h3>
            <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-background/60">
              {t("aiStylePage.softPaywall.hint", {
                defaultValue: "Selfie → yangi uslub. Ulgutib qoling — aksiya tugayapti.",
              })}
            </p>
          </div>
        </div>
      </div>

      <MorphPromoUrgencyBanner variant="glass" />

      <Link
        to="/referrals"
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-border text-[12px] font-bold text-muted-foreground hover:bg-muted/40"
      >
        <Sparkles className="size-3.5" />
        {t("homePage.subscriptionPromo.referralCta", {
          days: 7,
          defaultValue: "Yoki bepul 7 kun: 3 do‘st taklif qil",
        })}
        <Crown className="size-3 opacity-0" aria-hidden />
      </Link>
    </section>
  );
}
