import { Link } from "@tanstack/react-router";
import { Crown, Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Blurred preview image (optional). */
  previewUrl?: string | null;
};

/** Soft paywall — obunasiz userlar uchun (urgency / promokod yo'q). */
export function MorphSoftPaywall({ className, previewUrl }: Props) {
  const { t } = useTranslation();
  const meQ = useSubscriptionMe();
  const offer = meQ.data?.welcome_offer;
  const discountHint =
    offer?.eligible === true
      ? `Yangi hisob: tariflarga −${offer.discount_pct}%.`
      : "Obuna bilan Morph AI to‘liq ochiladi.";

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
                defaultValue: `Selfie → yangi uslub. ${discountHint}`,
              })}
            </p>
            <Link
              to="/wallet"
              search={{ section: "subscriptions", plan: "plus", returnTo: "/ai-style" }}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-background px-5 text-[13px] font-bold text-foreground"
            >
              <Crown className="size-4" strokeWidth={2.25} />
              Obuna olish
            </Link>
          </div>
        </div>
      </div>

      <Link
        to="/referrals"
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-border text-[12px] font-bold text-muted-foreground hover:bg-muted/40"
      >
        <Sparkles className="size-3.5" />
        {t("homePage.subscriptionPromo.referralCta", {
          days: 7,
          defaultValue: "Yoki bepul 7 kun: 3 do‘st taklif qil",
        })}
      </Link>
    </section>
  );
}
