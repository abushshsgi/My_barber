import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronRight,
  Crown,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscriptionMe, useSubscriptionPlans } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

const PLAN_META = [
  { code: "starter", Icon: Zap, blurbKey: "starter" as const },
  { code: "plus", Icon: Sparkles, blurbKey: "plus" as const },
  { code: "pro", Icon: Crown, blurbKey: "pro" as const },
];

function formatUzs(n: number) {
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

/**
 * Home marketing — obunaga majburlovchi/ tavsiya qiluvchi reklama.
 * Ikonkalar + tariflar + Obunalar sahifasiga link.
 */
export function HomeSubscriptionMarketing({ className }: { className?: string }) {
  const { t } = useTranslation();
  const meQ = useSubscriptionMe();
  const plansQ = useSubscriptionPlans();
  const hasActive = Boolean(meQ.data?.has_active);
  const activeCode = meQ.data?.subscription?.plan_code ?? null;
  const plans = plansQ.data ?? [];

  const title = hasActive
    ? t("homePage.subscriptionPromo.titleUpgrade", {
        defaultValue: "Tarifni kuchaytiring",
      })
    : t("homePage.subscriptionPromo.title", {
        defaultValue: "Morph AI — faqat obuna bilan",
      });

  const hint = hasActive
    ? t("homePage.subscriptionPromo.hintUpgrade", {
        defaultValue: "Ko‘proq generatsiya, Studio va oila — Plus yoki Pro ga o‘ting.",
      })
    : t("homePage.subscriptionPromo.hint", {
        defaultValue:
          "Yangi hisobda Morph AI yopiq. Starter / Plus / Pro tanlang yoki 3 do‘st taklif qilib Starter sinov oling.",
      });

  return (
    <section className={cn("px-4", className)}>
      <div className="overflow-hidden rounded-[24px] border border-border bg-foreground text-background">
        <div className="relative px-4 pb-4 pt-5 sm:px-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-background/10 blur-2xl"
          />

          <div className="relative flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background text-foreground">
              <Wand2 className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/55">
                {t("homePage.subscriptionPromo.eyebrow", { defaultValue: "Tavsiya" })}
              </p>
              <h2 className="mt-1 text-[17px] font-bold leading-snug tracking-tight">{title}</h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-background/65">{hint}</p>
            </div>
          </div>

          <ul className="relative mt-4 space-y-2">
            {(
              [
                {
                  Icon: Sparkles,
                  text: t("homePage.subscriptionPromo.perk1", {
                    defaultValue: "Selfie → mos uslub bir zumda",
                  }),
                },
                {
                  Icon: BadgeCheck,
                  text: t("homePage.subscriptionPromo.perk2", {
                    defaultValue: "Profil ismingiz yonida tasdiq galochkasi",
                  }),
                },
                {
                  Icon: Crown,
                  text: t("homePage.subscriptionPromo.perk3", {
                    defaultValue: "Studio, oila va yuqori limitlar (Plus/Pro)",
                  }),
                },
              ] as const
            ).map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[12px] font-medium text-background/85">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-background/15">
                  <Icon className="size-3.5" strokeWidth={2.25} />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {PLAN_META.map(({ code, Icon, blurbKey }) => {
              const plan = plans.find((p) => p.code === code);
              const isActive = activeCode === code;
              return (
                <Link
                  key={code}
                  to="/wallet"
                  search={{ section: "subscriptions" }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-[transform,background-color] active:scale-[0.98]",
                    isActive
                      ? "border-background bg-background text-foreground"
                      : "border-background/20 bg-background/10 text-background hover:bg-background/15",
                  )}
                >
                  <Icon className="size-4" strokeWidth={2.25} />
                  <span className="text-[11px] font-bold leading-none">
                    {plan?.name_uz ?? code}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-semibold leading-tight tabular-nums",
                      isActive ? "text-foreground/60" : "text-background/55",
                    )}
                  >
                    {plan
                      ? formatUzs(plan.price_uzs)
                      : t(`homePage.subscriptionPromo.plans.${blurbKey}`, {
                          defaultValue: blurbKey,
                        })}
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-background text-[14px] font-bold text-foreground active:scale-[0.99]"
          >
            {hasActive
              ? t("homePage.subscriptionPromo.ctaManage", {
                  defaultValue: "Obunani boshqarish",
                })
              : t("homePage.subscriptionPromo.cta", {
                  defaultValue: "Obuna olish",
                })}
            <ChevronRight className="size-4" strokeWidth={2.5} />
          </Link>

          <Link
            to="/referrals"
            className="relative mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-background/25 text-[12px] font-bold text-background/80 hover:bg-background/10"
          >
            {t("homePage.subscriptionPromo.referralCta", {
              defaultValue: "Yoki 3 do‘st taklif qil — 7 kun Starter",
            })}
          </Link>
        </div>
      </div>
    </section>
  );
}
