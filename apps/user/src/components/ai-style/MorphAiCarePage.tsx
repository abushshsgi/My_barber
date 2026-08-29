import { Link, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Loader2, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { navigateBack } from "@/lib/mobile-back";
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
import { useHairCareProfile, useUpdateHairCareProfile } from "@/hooks/use-hair-care-profile";
import { useCareProducts } from "@/hooks/use-care-products";

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: ColorStatus[] = ["natural", "colored", "bleached"];

type QuizStep = 0 | 1 | 2;

const ease = [0.22, 1, 0.36, 1] as const;

export function MorphAiCarePage() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const accessQ = useQuery({
    queryKey: ["subscriptions", "care-access"],
    queryFn: fetchCareAccess,
    staleTime: 30_000,
  });
  const hairQ = useHairCareProfile();
  const updateHair = useUpdateHairCareProfile();
  const catalogQ = useCareProducts({ recommended: true });
  const profile = useMemo(() => loadFaceProfile(), []);
  const savedQuiz = useMemo(() => loadCareQuiz(), []);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(
    () => savedQuiz ?? defaultQuizFromProfile(profile),
  );
  const [step, setStep] = useState<QuizStep | "plan">(savedQuiz ? "plan" : 0);
  const plan = useMemo(() => buildCarePlan(profile, quiz), [profile, quiz]);
  const catalogProducts = catalogQ.data || [];
  const hydratedHair = useRef(false);

  useEffect(() => {
    if (hydratedHair.current || !hairQ.data?.complete) return;
    hydratedHair.current = true;
    const next: CareQuizAnswers = {
      condition: hairQ.data.condition as HairCondition,
      texture: hairQ.data.texture as HairTexture,
      colorStatus: hairQ.data.color_status as ColorStatus,
    };
    setQuiz(next);
    saveCareQuiz(next);
    setStep("plan");
  }, [hairQ.data]);

  if (accessQ.isLoading || hairQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#FAFAFA] text-[#111111]">
        <Loader2 className="size-6 animate-spin text-[#111111]/40" />
      </div>
    );
  }

  if (accessQ.data && !accessQ.data.allowed) {
    return (
      <div
        className="min-h-[100dvh] bg-[#FAFAFA] px-5 text-[#111111]"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <BackLink label={t("common.back")} />
        <div className="mx-auto mt-24 max-w-xs text-center">
          <Lock className="mx-auto size-6 text-[#111111]/50" />
          <h1 className="mt-4 text-lg font-semibold tracking-tight">
            {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
          </h1>
          <p className="mt-2 text-sm text-[#111111]/50">
            {accessQ.data.detail ||
              t("aiStylePage.care.proOnly", { defaultValue: "Pro obunasida." })}
          </p>
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            className="mt-8 inline-flex h-12 items-center rounded-full bg-[#111111] px-6 text-sm font-semibold text-white"
          >
            {t("aiStylePage.care.seePlans", { defaultValue: "Obunalar" })}
          </Link>
        </div>
      </div>
    );
  }

  const finishQuiz = () => {
    saveCareQuiz(quiz);
    void updateHair.mutateAsync({
      condition: quiz.condition,
      texture: quiz.texture,
      color_status: quiz.colorStatus,
    }).catch(() => undefined);
    setStep("plan");
  };

  if (step !== "plan") {
    const questions = [
      {
        title: t("aiStylePage.care.quiz.conditionQ", { defaultValue: "Soch holati?" }),
        options: CONDITION_OPTS,
        value: quiz.condition,
        onPick: (v: string) => setQuiz((q) => ({ ...q, condition: v as HairCondition })),
        labelKey: "aiStylePage.care.conditions",
      },
      {
        title: t("aiStylePage.care.quiz.textureQ", { defaultValue: "Tekstura?" }),
        options: TEXTURE_OPTS,
        value: quiz.texture,
        onPick: (v: string) => setQuiz((q) => ({ ...q, texture: v as HairTexture })),
        labelKey: "aiStylePage.care.textures",
      },
      {
        title: t("aiStylePage.care.quiz.colorQ", { defaultValue: "Rang?" }),
        options: COLOR_OPTS,
        value: quiz.colorStatus,
        onPick: (v: string) => setQuiz((q) => ({ ...q, colorStatus: v as ColorStatus })),
        labelKey: "aiStylePage.care.colors",
      },
    ] as const;
    const current = questions[step];
    const progress = ((step + 1) / questions.length) * 100;

    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#FAFAFA] text-[#111111]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.07),transparent_65%)]" />
        <div
          className="relative z-[1] flex min-h-[100dvh] flex-col px-5 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between">
            <BackLink label={t("common.back")} />
            <span className="text-[12px] tabular-nums text-[#111111]/35">
              {step + 1}/3
            </span>
          </div>

          <div className="mt-6 h-[2px] overflow-hidden rounded-full bg-white">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: reduce ? 0 : 0.4, ease }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.32, ease }}
              className="mt-10 flex-1"
            >
              <h1 className="max-w-[16rem] text-[1.7rem] font-semibold leading-[1.15] tracking-tight">
                {current.title}
              </h1>

              <div
                className={cn(
                  "mt-7 grid gap-2.5",
                  current.options.length === 3 ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                {current.options.map((opt, i) => {
                  const selected = current.value === opt;
                  return (
                    <motion.button
                      key={opt}
                      type="button"
                      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * i, duration: 0.3, ease }}
                      onClick={() => current.onPick(opt)}
                      className={cn(
                        "relative cursor-pointer overflow-hidden rounded-[20px] border text-left touch-manipulation",
                        selected ? "border-white" : "border-black/10",
                      )}
                    >
                      <div className="relative aspect-[3/4]">
                        <img
                          src={careOptionImage(opt)}
                          alt=""
                          className="h-full w-full object-cover object-top"
                          draggable={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <p className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 text-[12px] font-semibold leading-tight">
                          {t(`${current.labelKey}.${opt}`, { defaultValue: opt })}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as QuizStep)}
                className="h-12 flex-1 cursor-pointer rounded-full border border-black/10 text-sm font-semibold"
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
              className="h-12 flex-[1.6] cursor-pointer rounded-full bg-[#111111] text-sm font-semibold text-white active:scale-[0.98]"
            >
              {step === 2
                ? t("aiStylePage.care.quiz.seePlan", { defaultValue: "Davom etish" })
                : t("common.next")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const traits = [
    {
      label: t("aiStylePage.care.condition", { defaultValue: "Holat" }),
      value: t(`aiStylePage.care.conditions.${plan.condition}`),
      key: plan.condition,
    },
    {
      label: t("aiStylePage.care.texture", { defaultValue: "Tekstura" }),
      value: t(`aiStylePage.care.textures.${plan.texture}`),
      key: plan.texture,
    },
    {
      label: t("aiStylePage.care.colorStatus", { defaultValue: "Rang" }),
      value: t(`aiStylePage.care.colors.${plan.colorStatus}`),
      key: plan.colorStatus,
    },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#FAFAFA] text-[#111111]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />

      <div
        className="relative z-[1] px-5 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          <BackLink label={t("common.back")} />
          <button
            type="button"
            onClick={() => setStep(0)}
            className="cursor-pointer text-[13px] font-medium text-[#111111]/45"
          >
            {t("aiStylePage.care.quiz.retake", { defaultValue: "Qayta" })}
          </button>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="mt-8"
        >
          <p className="text-[12px] font-medium tracking-wide text-[#111111]/35">
            {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
          </p>
          <h1 className="mt-2 max-w-[17rem] text-[1.75rem] font-semibold leading-[1.12] tracking-tight">
            {t("aiStylePage.care.title", { defaultValue: "Sizning rejangiz" })}
          </h1>
          <p className="mt-3 max-w-[22rem] text-[15px] leading-relaxed text-[#111111]/70">
            {plan.summary}
          </p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35, ease }}
          className="mt-6 grid grid-cols-3 gap-2"
        >
          {traits.map((item) => (
            <div key={item.key} className="overflow-hidden rounded-2xl bg-white">
              <img
                src={careOptionImage(item.key)}
                alt=""
                className="aspect-[4/5] w-full object-cover object-top"
              />
              <div className="px-2 py-2">
                <p className="text-[10px] text-[#111111]/35">{item.label}</p>
                <p className="truncate text-[12px] font-semibold">{item.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <Section title={t("aiStylePage.care.weeklyTitle", { defaultValue: "Hafta" })} delay={0.12}>
          <div className="space-y-1.5">
            {plan.weekly.map((row, i) => (
              <motion.div
                key={row.day}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 + i * 0.04, duration: 0.3, ease }}
                className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3"
              >
                <span className="w-8 text-[13px] font-semibold text-[#111111]/40">{row.day}</span>
                <span className="text-[14px] font-medium">{row.task}</span>
              </motion.div>
            ))}
          </div>
        </Section>

        <Section title={t("aiStylePage.care.productsTitle", { defaultValue: "Mahsulotlar" })} delay={0.2}>
          <div className="space-y-1.5">
            {(catalogProducts.length > 0
              ? catalogProducts.slice(0, 4).map((p) => ({
                  id: p.id,
                  href: true as const,
                  name: p.name,
                  role: p.brand || p.category,
                  tip: p.purpose_uz || p.usage_uz,
                }))
              : plan.products.map((p) => ({
                  id: p.name,
                  href: false as const,
                  name: p.name,
                  role: p.role,
                  tip: p.tip,
                }))
            ).map((p, i) => {
              const inner = (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14px] font-semibold">{p.name}</p>
                    <p className="shrink-0 text-[11px] text-[#111111]/35">{p.role}</p>
                  </div>
                  {p.tip ? <p className="mt-1 text-[13px] text-[#111111]/50">{p.tip}</p> : null}
                </>
              );
              const cls = "rounded-2xl bg-white px-3.5 py-3.5";
              return (
                <motion.div
                  key={p.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.04, duration: 0.3, ease }}
                >
                  {p.href ? (
                    <Link
                      to="/ai-style/care/products/$productId"
                      params={{ productId: String(p.id) }}
                      className={cn(cls, "block")}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Section>

        <Section title={t("aiStylePage.care.stylingTitle", { defaultValue: "Styling" })} delay={0.28}>
          <ol className="space-y-1.5">
            {plan.stylingTips.map((tip, i) => (
              <motion.li
                key={tip}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.3, ease }}
                className="flex gap-3 rounded-2xl bg-white px-3.5 py-3 text-[14px] leading-snug text-[#111111]/80"
              >
                <span className="shrink-0 text-[#111111]/30">{i + 1}</span>
                {tip}
              </motion.li>
            ))}
          </ol>
        </Section>

        <Section title={t("aiStylePage.care.avoidTitle", { defaultValue: "Qilmang" })} delay={0.36}>
          <div className="flex flex-wrap gap-2">
            {plan.avoid.map((item, i) => (
              <motion.span
                key={item}
                initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.38 + i * 0.03, duration: 0.25, ease }}
                className="rounded-full bg-[#F0F0F0] px-3.5 py-2 text-[13px] text-[#111111]/60"
              >
                {item}
              </motion.span>
            ))}
          </div>
        </Section>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.35, ease }}
          className="mt-10"
        >
          <p className="text-[14px] text-[#111111]/55">
            {t("aiStylePage.care.nextCut", {
              defaultValue: "Keyingi trim · ~{{days}} kun",
              days: plan.nextCutDays,
            })}
          </p>
          <Link
            to="/ai-style/care/ingredient"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-[#111111] ring-1 ring-black/10 active:scale-[0.98]"
          >
            {t("aiStylePage.care.ingredientScan.cta", {
              defaultValue: "Tarkib skani",
            })}
          </Link>
          <Link
            to="/ai-style/care/products"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-[#111111] ring-1 ring-black/10 active:scale-[0.98]"
          >
            {t("aiStylePage.care.catalog.cta", { defaultValue: "Barcha vositalar" })}
          </Link>
          <Link
            to="/explore"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white active:scale-[0.98]"
          >
            {t("aiStylePage.care.exploreCta", { defaultValue: "Uslub tanlash" })}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => navigateBack(router, "/ai-style")}
      className="inline-flex size-11 items-center justify-center rounded-full bg-[#F0F0F0] touch-manipulation cursor-pointer active:scale-95 transition-transform"
      aria-label={label}
    >
      <ChevronLeft className="size-5" strokeWidth={2.25} />
    </button>
  );
}

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease }}
      className="mt-9"
    >
      <h2 className="mb-3 text-[12px] font-medium tracking-wide text-[#111111]/35">{title}</h2>
      {children}
    </motion.section>
  );
}
