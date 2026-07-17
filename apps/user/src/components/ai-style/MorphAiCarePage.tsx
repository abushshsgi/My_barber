import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  Droplets,
  Leaf,
  Scissors,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildCarePlan, type ProductBudget } from "@/lib/morph-ai-care";
import { loadFaceProfile } from "@/lib/face-profile";
import { cn } from "@/lib/utils";

const BUDGET_FILTERS: (ProductBudget | "all")[] = ["all", "budget", "mid", "premium"];

export function MorphAiCarePage() {
  const { t } = useTranslation();
  const profile = useMemo(() => loadFaceProfile(), []);
  const plan = useMemo(() => buildCarePlan(profile), [profile]);
  const [budget, setBudget] = useState<ProductBudget | "all">("all");

  const products = plan.products.filter((p) => budget === "all" || p.budget === budget);

  return (
    <div className="min-h-[100dvh] bg-[#0b0b0b] text-white">
      <div
        className="relative overflow-hidden px-5 pb-8"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
        <div className="relative z-[1]">
          <Link
            to="/ai-style"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-bold text-white backdrop-blur-md touch-manipulation"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            {t("common.back")}
          </Link>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
            <Droplets className="h-3.5 w-3.5" />
            {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
          </div>
          <h1 className="mt-3 max-w-[18rem] text-[1.85rem] font-bold leading-tight tracking-tight">
            {t("aiStylePage.care.title", { defaultValue: "Sochingiz uchun shaxsiy reja" })}
          </h1>
          <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/65">
            {plan.summary}
          </p>
        </div>
      </div>

      <div className="space-y-8 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <section className="grid grid-cols-2 gap-2.5">
          {[
            {
              label: t("aiStylePage.care.condition", { defaultValue: "Holat" }),
              value: t(`aiStylePage.care.conditions.${plan.condition}`, { defaultValue: plan.condition }),
            },
            {
              label: t("aiStylePage.care.texture", { defaultValue: "Tekstura" }),
              value: t(`aiStylePage.care.textures.${plan.texture}`, { defaultValue: plan.texture }),
            },
            {
              label: t("aiStylePage.care.density", { defaultValue: "Qalinlik" }),
              value: t(`aiStylePage.care.densities.${plan.density}`, { defaultValue: plan.density }),
            },
            {
              label: t("aiStylePage.care.scalp", { defaultValue: "Bosh terisi" }),
              value: t(`aiStylePage.care.scalps.${plan.scalp}`, { defaultValue: plan.scalp }),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-white/10 bg-white/[0.04] px-3.5 py-3.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">{item.label}</p>
              <p className="mt-1.5 text-sm font-bold capitalize">{item.value}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-white/70" />
            <h2 className="text-lg font-bold">
              {t("aiStylePage.care.weeklyTitle", { defaultValue: "Haftalik reja" })}
            </h2>
          </div>
          <div className="space-y-2">
            {plan.weekly.map((row, i) => (
              <motion.div
                key={row.day}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-white text-xs font-bold text-black">
                  {row.day}
                </span>
                <p className="text-sm font-semibold text-white/90">{row.task}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-white/70" />
              <h2 className="text-lg font-bold">
                {t("aiStylePage.care.productsTitle", { defaultValue: "Mahsulotlar" })}
              </h2>
            </div>
          </div>
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {BUDGET_FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setBudget(key)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold touch-manipulation",
                  budget === key ? "bg-white text-black" : "border border-white/15 bg-white/5 text-white/75",
                )}
              >
                {t(`aiStylePage.care.budgets.${key}`, { defaultValue: key })}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3.5"
              >
                <div>
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/55">{p.role}</p>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80">
                  {t(`aiStylePage.care.budgets.${p.budget}`, { defaultValue: p.budget })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-white/70" />
            <h2 className="text-lg font-bold">
              {t("aiStylePage.care.avoidTitle", { defaultValue: "Nima qilmaslik" })}
            </h2>
          </div>
          <div className="space-y-2">
            {plan.avoid.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white/85"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Scissors className="h-4 w-4 text-white/70" />
            <h2 className="text-lg font-bold">
              {t("aiStylePage.care.salonTitle", { defaultValue: "Salon maslahati" })}
            </h2>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] p-4">
            <p className="text-sm font-bold">
              {t("aiStylePage.care.nextCut", {
                defaultValue: "Keyingi soch olish: ~{{days}} kun ichida",
                days: plan.nextCutDays,
              })}
            </p>
            <ul className="mt-3 space-y-2">
              {plan.salonTips.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-white/75">
                  <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50" />
                  {tip}
                </li>
              ))}
            </ul>
            <Link
              to="/explore"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-black touch-manipulation active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {t("aiStylePage.care.exploreCta", { defaultValue: "Uslub tanlash" })}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
