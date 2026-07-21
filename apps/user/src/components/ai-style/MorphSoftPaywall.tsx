import { Link } from "@tanstack/react-router";
import { Crown, Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Blurred preview image (optional). */
  previewUrl?: string | null;
};

/**
 * Soft paywall — blur preview + primary unlock CTA (pay first, referral secondary).
 */
export function MorphSoftPaywall({ className, previewUrl }: Props) {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-border bg-foreground text-background",
        className,
      )}
    >
      <div className="relative min-h-[200px]">
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

        <div className="relative flex flex-col items-center px-5 py-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-background/20 bg-background/10">
            <Lock className="size-6" strokeWidth={1.75} />
          </span>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-background/50">
            Morph AI
          </p>
          <h3 className="mt-2 max-w-sm text-xl font-bold leading-snug tracking-tight">
            {t("aiStylePage.softPaywall.title", {
              defaultValue: "To‘liq ko‘rish uchun oching",
            })}
          </h3>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-background/60">
            {t("aiStylePage.softPaywall.hint", {
              defaultValue: "Selfie → yangi uslub. Starter bilan bir zumda ochiladi.",
            })}
          </p>

          <Link
            to="/wallet"
            search={{ section: "subscriptions", plan: "starter", returnTo: "/ai-style" }}
            className="mt-5 inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-background text-[14px] font-bold text-foreground"
          >
            <Crown className="size-4" strokeWidth={2.25} />
            {t("aiStylePage.limitSheet.buyPlan", {
              defaultValue: "Morph AI ni ochish — Starter",
            })}
          </Link>
          <Link
            to="/referrals"
            className="mt-2 inline-flex h-10 w-full max-w-xs items-center justify-center gap-1.5 text-[12px] font-bold text-background/75"
          >
            <Sparkles className="size-3.5" />
            {t("homePage.subscriptionPromo.referralCta", {
              days: 7,
              defaultValue: "Bepul 7 kun: 3 do‘st taklif qil",
            })}
          </Link>
        </div>
      </div>
    </section>
  );
}
