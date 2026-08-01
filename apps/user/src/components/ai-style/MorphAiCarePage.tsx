import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  Droplets,
  ExternalLink,
  Leaf,
  Loader2,
  Lock,
  Scissors,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  buildCarePlan,
  defaultQuizFromProfile,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
  type ColorStatus,
  type HairCondition,
  type HairTexture,
  type ProductBudget,
} from "@/lib/morph-ai-care";
import { loadFaceProfile } from "@/lib/face-profile";
import { fetchCareAccess } from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";

const BUDGET_FILTERS: (ProductBudget | "all")[] = ["all", "budget", "mid", "premium"];

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: ColorStatus[] = ["natural", "colored", "bleached"];
const BUDGET_OPTS: ProductBudget[] = ["budget", "mid", "premium"];

type QuizStep = 0 | 1 | 2 | 3;

export function MorphAiCarePage() {
  const { t } = useTranslation();
  const accessQ = useQuery({
    queryKey: ["subscriptions", "care-access"],
    queryFn: fetchCareAccess,
    staleTime: 30_000,
  });
  const profile = useMemo(() => loadFaceProfile(), []);
  const savedQuiz = useMemo(() => loadCareQuiz(), []);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(() => savedQuiz ?? defaultQuizFromProfile(profile));
  const [step, setStep] = useState<QuizStep | "plan">(savedQuiz ? "plan" : 0);
  const [budget, setBudget] = useState<ProductBudget | "all">(savedQuiz?.budget ?? "all");

  const plan = useMemo(() => buildCarePlan(profile, quiz), [profile, quiz]);

  if (accessQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0b0b0b] text-white">
        <Loader2 className="h-7 w-7 animate-spin text-white/60" />
      </div>
    );
  }

  if (accessQ.data && !accessQ.data.allowed) {
    return (
      <div className="min-h-[100dvh] bg-[#0b0b0b] px-5 text-white" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <Link
          to="/ai-style"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-bold text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
        <div className="mx-auto mt-16 max-w-sm text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/10">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">
            {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
          </h1>
          <p className="mt-2 text-sm text-white/65">
            {accessQ.data.detail || "Bu funksiya Pro obunasida mavjud."}
          </p>
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black"
          >
            Obunalarni ko'rish
          </Link>
        </div>
      </div>
    );
  }

  const finishQuiz = () => {
    saveCareQuiz(quiz);
    setBudget(quiz.budget);
    setStep("plan");
  };

  if (step !== "plan") {
    const questions: {
      title: string;
      options: string[];
      value: string;
      onPick: (v: string) => void;
      labelKey: string;
    }[] = [
      {
        title: t("aiStylePage.care.quiz.conditionQ", { defaultValue: "Sochingiz qanday holatda?" }),
        options: CONDITION_OPTS,
        value: quiz.condition,
        onPick: (v) => setQuiz((q) => ({ ...q, condition: v as HairCondition })),
        labelKey: "aiStylePage.care.conditions",
      },
      {
        title: t("aiStylePage.care.quiz.textureQ", { defaultValue: "Tekstura qanday?" }),
        options: TEXTURE_OPTS,
        value: quiz.texture,
        onPick: (v) => setQuiz((q) => ({ ...q, texture: v as HairTexture })),
        labelKey: "aiStylePage.care.textures",
      },
      {
        title: t("aiStylePage.care.quiz.colorQ", { defaultValue: "Rang / bo‘yoq holati?" }),
        options: COLOR_OPTS,
        value: quiz.colorStatus,
        onPick: (v) => setQuiz((q) => ({ ...q, colorStatus: v as ColorStatus })),
        labelKey: "aiStylePage.care.colors",
      },
      {
        title: t("aiStylePage.care.quiz.budgetQ", { defaultValue: "Mahsulot byudjeti?" }),
        options: BUDGET_OPTS,
        value: quiz.budget,
        onPick: (v) => setQuiz((q) => ({ ...q, budget: v as ProductBudget })),
        labelKey: "aiStylePage.care.budgets",
      },
    ];
    const current = questions[step]!;

    return (
      <div className="min-h-[100dvh] bg-[#0b0b0b] text-white">
        <div className="px-5 pb-8" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <Link
            to="/ai-style"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-bold text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
            {t("aiStylePage.care.quiz.progress", {
              defaultValue: "{{step}} / 4",
              step: step + 1,
            })}
          </p>
          <h1 className="mt-2 max-w-sm text-[1.65rem] font-bold leading-tight tracking-tight">
            {current.title}
          </h1>

          <div className="mt-6 space-y-2.5">
            {current.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => current.onPick(opt)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition-colors duration-200",
                  current.value === opt
                    ? "border-white bg-white text-black"
                    : "border-white/15 bg-white/[0.04] text-white active:bg-white/10",
                )}
              >
                {t(`${current.labelKey}.${opt}`, { defaultValue: opt })}
              </button>
            ))}
          </div>

          <div className="mt-8 flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as QuizStep)}
                className="h-12 flex-1 cursor-pointer rounded-2xl border border-white/15 text-sm font-bold"
              >
                {t("common.back")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (step === 3) finishQuiz();
                else setStep((step + 1) as QuizStep);
              }}
              className="h-12 flex-[1.4] cursor-pointer rounded-2xl bg-white text-sm font-bold text-black"
            >
              {step === 3
                ? t("aiStylePage.care.quiz.seePlan", { defaultValue: "Rejani ko‘rish" })
                : t("common.next")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const products = plan.products.filter((p) => budget === "all" || p.budget === budget);

  return (
    <div className="min-h-[100dvh] bg-[#0b0b0b] text-white">
      <div
        className="relative overflow-hidden px-5 pb-8"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
        <div className="relative z-[1]">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/ai-style"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-bold text-white backdrop-blur-md touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              {t("common.back")}
            </Link>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-bold text-white/70"
            >
              {t("aiStylePage.care.quiz.retake", { defaultValue: "Qayta so‘rov" })}
            </button>
          </div>

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
              label: t("aiStylePage.care.colorStatus", { defaultValue: "Rang" }),
              value: t(`aiStylePage.care.colors.${plan.colorStatus}`, { defaultValue: plan.colorStatus }),
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
                  "shrink-0 cursor-pointer rounded-full px-3.5 py-2 text-xs font-bold touch-manipulation",
                  budget === key ? "bg-white text-black" : "border border-white/15 bg-white/5 text-white/75",
                )}
              >
                {t(`aiStylePage.care.budgets.${key}`, { defaultValue: key })}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {products.map((p) => (
              <a
                key={p.name}
                href={p.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3.5 transition-colors duration-200 active:bg-white/[0.07]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/55">{p.role}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80">
                  {t(`aiStylePage.care.budgets.${p.budget}`, { defaultValue: p.budget })}
                  <ExternalLink className="size-3 opacity-70" />
                </span>
              </a>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            {t("aiStylePage.care.productsHint", {
              defaultValue: "Uzum’da qidiruv ochiladi — mahsulotni o‘zingiz tanlaysiz",
            })}
          </p>
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
              to="/map"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-black touch-manipulation active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {t("aiStylePage.care.bookNearby", { defaultValue: "Yaqin salonlarni ko‘rish" })}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
