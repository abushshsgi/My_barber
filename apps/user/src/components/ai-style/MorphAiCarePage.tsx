import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  Droplets,
  Loader2,
  Lock,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  buildCarePlan,
  careOptionImage,
  defaultQuizFromProfile,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
  type ColorStatus,
  type HairCondition,
  type HairTexture,
} from "@/lib/morph-ai-care";
import { loadFaceProfile } from "@/lib/face-profile";
import { fetchCareAccess } from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: ColorStatus[] = ["natural", "colored", "bleached"];

type QuizStep = 0 | 1 | 2;

function fadeUp(i: number, reduce: boolean | null) {
  if (reduce) return {};
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  };
}

export function MorphAiCarePage() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const accessQ = useQuery({
    queryKey: ["subscriptions", "care-access"],
    queryFn: fetchCareAccess,
    staleTime: 30_000,
  });
  const profile = useMemo(() => loadFaceProfile(), []);
  const savedQuiz = useMemo(() => loadCareQuiz(), []);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(() => savedQuiz ?? defaultQuizFromProfile(profile));
  const [step, setStep] = useState<QuizStep | "plan">(savedQuiz ? "plan" : 0);

  const plan = useMemo(() => buildCarePlan(profile, quiz), [profile, quiz]);

  if (accessQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#070707] text-white">
        <Loader2 className="h-7 w-7 animate-spin text-white/50" />
      </div>
    );
  }

  if (accessQ.data && !accessQ.data.allowed) {
    return (
      <div
        className="min-h-[100dvh] bg-[#070707] px-5 text-white"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <Link
          to="/ai-style"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3.5 py-2 text-sm font-bold touch-manipulation"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          {t("common.back")}
        </Link>
        <div className="mx-auto mt-20 max-w-sm text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/12 bg-white/[0.06]">
            <Lock className="h-6 w-6 text-white/80" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            {accessQ.data.detail ||
              t("aiStylePage.care.proOnly", {
                defaultValue: "Bu funksiya Pro obunasida mavjud.",
              })}
          </p>
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-bold text-black touch-manipulation"
          >
            {t("aiStylePage.care.seePlans", { defaultValue: "Obunalarni ko‘rish" })}
          </Link>
        </div>
      </div>
    );
  }

  const finishQuiz = () => {
    saveCareQuiz(quiz);
    setStep("plan");
  };

  if (step !== "plan") {
    const questions: {
      title: string;
      hint: string;
      options: string[];
      value: string;
      onPick: (v: string) => void;
      labelKey: string;
    }[] = [
      {
        title: t("aiStylePage.care.quiz.conditionQ", { defaultValue: "Sochingiz qanday holatda?" }),
        hint: t("aiStylePage.care.quiz.conditionHint", {
          defaultValue: "Shu javob yuvish va mahsulot turini belgilaydi",
        }),
        options: CONDITION_OPTS,
        value: quiz.condition,
        onPick: (v) => setQuiz((q) => ({ ...q, condition: v as HairCondition })),
        labelKey: "aiStylePage.care.conditions",
      },
      {
        title: t("aiStylePage.care.quiz.textureQ", { defaultValue: "Tekstura qanday?" }),
        hint: t("aiStylePage.care.quiz.textureHint", {
          defaultValue: "Styling usuli shunga moslanadi",
        }),
        options: TEXTURE_OPTS,
        value: quiz.texture,
        onPick: (v) => setQuiz((q) => ({ ...q, texture: v as HairTexture })),
        labelKey: "aiStylePage.care.textures",
      },
      {
        title: t("aiStylePage.care.quiz.colorQ", { defaultValue: "Rang / bo‘yoq holati?" }),
        hint: t("aiStylePage.care.quiz.colorHint", {
          defaultValue: "Bo‘yalgan soch uchun alohida ehtiyot",
        }),
        options: COLOR_OPTS,
        value: quiz.colorStatus,
        onPick: (v) => setQuiz((q) => ({ ...q, colorStatus: v as ColorStatus })),
        labelKey: "aiStylePage.care.colors",
      },
    ];
    const current = questions[step]!;
    const progress = ((step + 1) / questions.length) * 100;

    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#070707] text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
        <div className="relative z-[1] px-5 pb-10" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/ai-style"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3.5 py-2 text-sm font-bold touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              {t("common.back")}
            </Link>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
              {t("aiStylePage.care.quiz.progress", {
                defaultValue: "{{step}} / 3",
                step: step + 1,
              })}
            </p>
          </div>

          <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <motion.div key={step} {...fadeUp(0, reduceMotion)} className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
              Morf AI · {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
            </p>
            <h1 className="mt-2 max-w-[20rem] text-[1.75rem] font-bold leading-[1.15] tracking-tight">
              {current.title}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-white/50">{current.hint}</p>
          </motion.div>

          <div className="mt-7 grid grid-cols-2 gap-2.5">
            {current.options.map((opt, i) => {
              const selected = current.value === opt;
              const image = careOptionImage(opt as HairCondition | HairTexture | ColorStatus);
              return (
                <motion.button
                  key={opt}
                  type="button"
                  {...fadeUp(i + 1, reduceMotion)}
                  onClick={() => current.onPick(opt)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-[22px] border text-left transition-colors duration-200 touch-manipulation",
                    selected
                      ? "border-white ring-2 ring-white"
                      : "border-white/12 active:border-white/30",
                  )}
                >
                  <div className="relative aspect-[4/5] w-full bg-white/[0.04]">
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover object-top"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
                      <p className="text-[13px] font-bold leading-tight text-white">
                        {t(`${current.labelKey}.${opt}`, { defaultValue: opt })}
                      </p>
                    </div>
                    {selected ? (
                      <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">
                        ✓
                      </span>
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-8 flex gap-2.5">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as QuizStep)}
                className="h-12 flex-1 cursor-pointer rounded-2xl border border-white/12 text-sm font-bold touch-manipulation"
              >
                {t("common.back")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (step === 2) finishQuiz();
                else setStep((step + 1) as QuizStep);
              }}
              className="h-12 flex-[1.5] cursor-pointer rounded-2xl bg-white text-sm font-bold text-black touch-manipulation active:scale-[0.98]"
            >
              {step === 2
                ? t("aiStylePage.care.quiz.seePlan", { defaultValue: "Rejani ko‘rish" })
                : t("common.next")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const traits: {
    label: string;
    value: string;
    imageKey: HairCondition | HairTexture | ColorStatus;
  }[] = [
    {
      label: t("aiStylePage.care.condition", { defaultValue: "Holat" }),
      value: t(`aiStylePage.care.conditions.${plan.condition}`, { defaultValue: plan.condition }),
      imageKey: plan.condition,
    },
    {
      label: t("aiStylePage.care.texture", { defaultValue: "Tekstura" }),
      value: t(`aiStylePage.care.textures.${plan.texture}`, { defaultValue: plan.texture }),
      imageKey: plan.texture,
    },
    {
      label: t("aiStylePage.care.colorStatus", { defaultValue: "Rang" }),
      value: t(`aiStylePage.care.colors.${plan.colorStatus}`, { defaultValue: plan.colorStatus }),
      imageKey: plan.colorStatus,
    },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#070707] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.09),_transparent_58%)]" />

      <div
        className="relative z-[1] px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/ai-style"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3.5 py-2 text-sm font-bold backdrop-blur-md touch-manipulation"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            {t("common.back")}
          </Link>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="cursor-pointer rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-[12px] font-bold text-white/65 touch-manipulation"
          >
            {t("aiStylePage.care.quiz.retake", { defaultValue: "Qayta so‘rov" })}
          </button>
        </div>

        <motion.header {...fadeUp(0, reduceMotion)} className="mt-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
            <Droplets className="h-3.5 w-3.5" />
            Morf AI · {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
          </div>
          <h1 className="mt-3 max-w-[19rem] text-[1.85rem] font-bold leading-[1.12] tracking-tight">
            {t("aiStylePage.care.title", { defaultValue: "Uslubingizni uyda saqlang" })}
          </h1>
          <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/55">
            {t("aiStylePage.care.subtitle", {
              defaultValue:
                "Soch olishni o‘rgatmaydi — yuvish, mahsulot turi va styling bo‘yicha shaxsiy yo‘riqnoma.",
            })}
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#CA8A04]">
              {t("aiStylePage.care.rememberedBadge", {
                defaultValue: "AI eslab qoldi",
              })}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/85">{plan.summary}</p>
          </div>
        </motion.header>

        <motion.div {...fadeUp(1, reduceMotion)} className="mt-5 grid grid-cols-3 gap-2">
          {traits.map((item) => (
            <div
              key={item.label}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <img
                src={careOptionImage(item.imageKey)}
                alt=""
                className="aspect-square w-full object-cover object-top"
              />
              <div className="px-2 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-white/90">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        <section className="mt-9">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            {t("aiStylePage.care.weeklyTitle", { defaultValue: "Haftalik reja" })}
          </h2>
          <div className="mt-3 space-y-2">
            {plan.weekly.map((row, i) => (
              <motion.div
                key={row.day}
                {...fadeUp(i + 2, reduceMotion)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-white text-xs font-bold text-black">
                  {row.day}
                </span>
                <p className="text-sm font-semibold text-white/90">{row.task}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            {t("aiStylePage.care.productsTitle", { defaultValue: "Mahsulot turlari" })}
          </h2>
          <p className="mt-1.5 text-sm text-white/45">
            {t("aiStylePage.care.productsHint", {
              defaultValue: "Brand emas — shu turdagi mahsulotlardan foydalaning",
            })}
          </p>
          <div className="mt-3 space-y-2">
            {plan.products.map((p, i) => (
              <motion.div
                key={p.name}
                {...fadeUp(i + 6, reduceMotion)}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold">{p.name}</p>
                  <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                    {p.role}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{p.tip}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <div className="flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5 text-white/45" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
              {t("aiStylePage.care.stylingTitle", { defaultValue: "Styling — qanday" })}
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-white/45">
            {t("aiStylePage.care.stylingHint", {
              defaultValue: "Uslubni uyda qayta yig‘ish uchun",
            })}
          </p>
          <ol className="mt-3 space-y-2">
            {plan.stylingTips.map((tip, i) => (
              <motion.li
                key={tip}
                {...fadeUp(i + 10, reduceMotion)}
                className="flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-sm leading-relaxed text-white/80"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-white/70">
                  {i + 1}
                </span>
                {tip}
              </motion.li>
            ))}
          </ol>
        </section>

        <section className="mt-9">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            {t("aiStylePage.care.avoidTitle", { defaultValue: "Nima qilmaslik" })}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.avoid.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] text-white/70"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <motion.section
          {...fadeUp(14, reduceMotion)}
          className="mt-9 rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
            {t("aiStylePage.care.trimLabel", { defaultValue: "Trim" })}
          </p>
          <p className="mt-2 text-base font-bold leading-snug">
            {t("aiStylePage.care.nextCut", {
              defaultValue: "Keyingi soch olish: ~{{days}} kun ichida",
              days: plan.nextCutDays,
            })}
          </p>
          <p className="mt-1.5 text-sm text-white/50">
            {t("aiStylePage.care.trimHint", {
              defaultValue: "Shakl saqlanishi uchun — stilist salonida. Uslubni avval Morph da sinab ko‘ring.",
            })}
          </p>
          <Link
            to="/explore"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-black touch-manipulation active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            {t("aiStylePage.care.exploreCta", { defaultValue: "Uslub tanlash" })}
          </Link>
        </motion.section>
      </div>
    </div>
  );
}
