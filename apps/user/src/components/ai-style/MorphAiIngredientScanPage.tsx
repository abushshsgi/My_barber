import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  FlaskConical,
  Images,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useIngredientScan } from "@/hooks/use-ingredient-scan";
import { useSkinProfile, useUpdateSkinProfile } from "@/hooks/use-skin-profile";
import { fetchCareAccess } from "@/lib/api/subscriptions";
import type { IngredientScanResponse } from "@/lib/api/ai";
import type { SkinSensitivity, SkinType } from "@/lib/api/skin-profile";
import { prepareSelfieFromFile } from "@/lib/selfie-image";
import { cn } from "@/lib/utils";

const SKIN_TYPES: SkinType[] = ["dry", "oily", "combination", "normal"];
const SENSITIVITY: SkinSensitivity[] = ["low", "medium", "high"];

type QuizStep = 0 | 1 | 2;
type Screen = "quiz" | "capture" | "result";

const ease = [0.22, 1, 0.36, 1] as const;

export function MorphAiIngredientScanPage() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const accessQ = useQuery({
    queryKey: ["subscriptions", "care-access"],
    queryFn: fetchCareAccess,
    staleTime: 30_000,
  });
  const skinQ = useSkinProfile();
  const updateSkin = useUpdateSkinProfile();
  const scan = useIngredientScan();

  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [acneProne, setAcneProne] = useState<boolean | null>(null);
  const [sensitivity, setSensitivity] = useState<SkinSensitivity | null>(null);
  const [quizStep, setQuizStep] = useState<QuizStep>(0);
  const [forceQuiz, setForceQuiz] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<IngredientScanResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const profileComplete = Boolean(skinQ.data?.complete);
  const screen: Screen = result
    ? "result"
    : forceQuiz || (!profileComplete && !skinQ.isLoading)
      ? "quiz"
      : "capture";

  if (accessQ.isLoading || skinQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#050505] text-white">
        <Loader2 className="size-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (accessQ.data && !accessQ.data.allowed) {
    return (
      <div
        className="min-h-[100dvh] bg-[#050505] px-5 text-white"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <BackLink label={t("common.back")} />
        <div className="mx-auto mt-24 max-w-xs text-center">
          <Lock className="mx-auto size-6 text-white/50" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {t("aiStylePage.care.ingredientScan.title", { defaultValue: "Tarkib skani" })}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {accessQ.data.detail ||
              t("aiStylePage.care.proOnly", { defaultValue: "Pro obunasida." })}
          </p>
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-semibold text-black"
          >
            {t("aiStylePage.care.seePlans", { defaultValue: "Obunalar" })}
          </Link>
        </div>
      </div>
    );
  }

  const finishQuiz = async () => {
    if (!skinType || acneProne === null || !sensitivity) return;
    try {
      await updateSkin.mutateAsync({
        skin_type: skinType,
        acne_prone: acneProne,
        sensitivity,
      });
      setForceQuiz(false);
      toast.success(
        t("aiStylePage.care.ingredientScan.profileSaved", {
          defaultValue: "Teri profilingiz saqlandi",
        }),
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("common.retry", { defaultValue: "Qayta urinish" }),
      );
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      setPreviewUrl(dataUrl);
      const analysis = await scan.mutateAsync(dataUrl);
      setResult(analysis);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t("aiStylePage.care.ingredientScan.analyzing", {
              defaultValue: "Tarkib tahlili muvaffaqiyatsiz.",
            }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (screen === "quiz") {
    const questions = [
      {
        title: t("aiStylePage.care.ingredientScan.quiz.skinTypeQ", {
          defaultValue: "Teri turi?",
        }),
        options: SKIN_TYPES.map((value) => ({
          value,
          label: t(`aiStylePage.care.ingredientScan.skinTypes.${value}`, {
            defaultValue: value,
          }),
        })),
        selected: skinType,
        onPick: (v: string) => setSkinType(v as SkinType),
      },
      {
        title: t("aiStylePage.care.ingredientScan.quiz.acneQ", {
          defaultValue: "Akne chiqadimi?",
        }),
        options: [
          {
            value: "yes",
            label: t("aiStylePage.care.ingredientScan.quiz.acneYes", {
              defaultValue: "Ha, akne chiqadi",
            }),
          },
          {
            value: "no",
            label: t("aiStylePage.care.ingredientScan.quiz.acneNo", {
              defaultValue: "Yo‘q",
            }),
          },
        ],
        selected: acneProne === null ? null : acneProne ? "yes" : "no",
        onPick: (v: string) => setAcneProne(v === "yes"),
      },
      {
        title: t("aiStylePage.care.ingredientScan.quiz.sensitivityQ", {
          defaultValue: "Sezgirlik?",
        }),
        options: SENSITIVITY.map((value) => ({
          value,
          label: t(`aiStylePage.care.ingredientScan.sensitivity.${value}`, {
            defaultValue: value,
          }),
        })),
        selected: sensitivity,
        onPick: (v: string) => setSensitivity(v as SkinSensitivity),
      },
    ] as const;
    const current = questions[quizStep];
    const canNext =
      quizStep === 0
        ? Boolean(skinType)
        : quizStep === 1
          ? acneProne !== null
          : Boolean(sensitivity);
    const progress = ((quizStep + 1) / questions.length) * 100;

    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#050505] text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.07),transparent_65%)]" />
        <div
          className="relative z-[1] flex min-h-[100dvh] flex-col px-5 pb-8"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <BackLink label={t("common.back")} />
          <p className="mt-6 text-[12px] font-medium tracking-wide text-white/35">
            {t("aiStylePage.care.ingredientScan.badge", { defaultValue: "Teri profili" })}
          </p>
          <h1 className="mt-2 max-w-[18rem] text-[1.75rem] font-semibold leading-[1.12] tracking-tight">
            {current.title}
          </h1>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-8 flex flex-1 flex-col gap-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={quizStep}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease }}
                className="space-y-2"
              >
                {current.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => current.onPick(opt.value)}
                    className={cn(
                      "flex h-14 w-full items-center rounded-2xl px-4 text-left text-[15px] font-medium transition-colors",
                      current.selected === opt.value
                        ? "bg-white text-black"
                        : "bg-white/[0.06] text-white active:bg-white/10",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-6 flex gap-2">
            {quizStep > 0 ? (
              <button
                type="button"
                onClick={() => setQuizStep((s) => (s - 1) as QuizStep)}
                className="h-12 flex-1 rounded-full bg-white/10 text-sm font-semibold"
              >
                {t("common.back")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!canNext || updateSkin.isPending}
              onClick={() => {
                if (quizStep === 2) void finishQuiz();
                else setQuizStep((s) => (s + 1) as QuizStep);
              }}
              className="h-12 flex-[1.6] rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40"
            >
              {updateSkin.isPending ? (
                <Loader2 className="mx-auto size-5 animate-spin" />
              ) : quizStep === 2 ? (
                t("aiStylePage.care.ingredientScan.quiz.save", { defaultValue: "Saqlash" })
              ) : (
                t("common.next")
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "result" && result) {
    const score = result.product_analysis.safety_score;
    const scoreColor =
      score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-300" : "text-rose-400";

    return (
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#050505] text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div
          className="relative z-[1] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <BackLink label={t("common.back")} />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mt-8"
          >
            <p className="text-[12px] font-medium tracking-wide text-white/35">
              {t("aiStylePage.care.ingredientScan.badge", { defaultValue: "Tarkib skani" })}
            </p>
            <div className="mt-3 flex items-end gap-3">
              <p className={cn("text-5xl font-semibold tracking-tight", scoreColor)}>{score}</p>
              <p className="mb-1.5 text-sm text-white/45">/ 100</p>
            </div>
            <p className="mt-2 max-w-[22rem] text-[15px] leading-relaxed text-white/75">
              {result.product_analysis.verdict}
            </p>
            <p className="mt-2 text-[12px] text-white/35">
              {t("aiStylePage.care.ingredientScan.ingredientsCount", {
                defaultValue: "{{count}} ta modda",
                count: result.product_analysis.total_ingredients_count,
              })}
            </p>
          </motion.div>

          {result.critical_alerts.length > 0 ? (
            <section className="mt-9">
              <h2 className="mb-3 text-[12px] font-medium tracking-wide text-white/35">
                {t("aiStylePage.care.ingredientScan.alertsTitle", {
                  defaultValue: "Ogohlantirishlar",
                })}
              </h2>
              <div className="space-y-2">
                {result.critical_alerts.map((alert, i) => (
                  <motion.div
                    key={`${alert.ingredient}-${i}`}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.3, ease }}
                    className="flex gap-3 rounded-2xl bg-rose-500/10 px-3.5 py-3.5 ring-1 ring-rose-400/20"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />
                    <div className="min-w-0">
                      {alert.ingredient ? (
                        <p className="text-[12px] font-semibold text-rose-200/90">
                          {alert.ingredient}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[14px] leading-snug text-white/80">
                        {alert.message_uz}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ) : null}

          {result.beneficial_ingredients.length > 0 ? (
            <section className="mt-9">
              <h2 className="mb-3 text-[12px] font-medium tracking-wide text-white/35">
                {t("aiStylePage.care.ingredientScan.beneficialTitle", {
                  defaultValue: "Foydali moddalar",
                })}
              </h2>
              <div className="space-y-2">
                {result.beneficial_ingredients.map((item, i) => (
                  <motion.div
                    key={`${item.ingredient}-${i}`}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.04, duration: 0.3, ease }}
                    className="flex gap-3 rounded-2xl bg-emerald-500/10 px-3.5 py-3.5 ring-1 ring-emerald-400/15"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-emerald-200/90">
                        {item.ingredient}
                      </p>
                      <p className="mt-0.5 text-[14px] leading-snug text-white/80">
                        {item.reason_uz}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setResult(null);
              setPreviewUrl(null);
            }}
            className="mt-10 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black active:scale-[0.98]"
          >
            {t("aiStylePage.care.ingredientScan.scanAgain", {
              defaultValue: "Yana skanerlash",
            })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
      <div
        className="relative z-[1] flex min-h-[100dvh] flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          <BackLink label={t("common.back")} />
          <button
            type="button"
            onClick={() => {
              setSkinType(
                skinQ.data?.skin_type && skinQ.data.skin_type !== "" ? skinQ.data.skin_type : null,
              );
              setAcneProne(
                typeof skinQ.data?.acne_prone === "boolean" ? skinQ.data.acne_prone : null,
              );
              setSensitivity(
                skinQ.data?.sensitivity && skinQ.data.sensitivity !== ""
                  ? skinQ.data.sensitivity
                  : null,
              );
              setQuizStep(0);
              setForceQuiz(true);
            }}
            className="cursor-pointer text-[13px] font-medium text-white/45"
          >
            {t("aiStylePage.care.ingredientScan.editProfile", {
              defaultValue: "Profil",
            })}
          </button>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="mt-8"
        >
          <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
            <FlaskConical className="size-5 text-white" strokeWidth={1.75} />
          </div>
          <p className="text-[12px] font-medium tracking-wide text-white/35">
            {t("aiStylePage.care.ingredientScan.badge", { defaultValue: "Tarkib skani" })}
          </p>
          <h1 className="mt-2 max-w-[18rem] text-[1.75rem] font-semibold leading-[1.12] tracking-tight">
            {t("aiStylePage.care.ingredientScan.title", {
              defaultValue: "Mahsulot tarkibini tekshiring",
            })}
          </h1>
          <p className="mt-3 max-w-[22rem] text-[15px] leading-relaxed text-white/55">
            {t("aiStylePage.care.ingredientScan.subtitle", {
              defaultValue:
                "Krem, loson yoki shampun orqasidagi Ingredients yozuvini suratga oling — AI foydali va zararli moddalarni aytadi.",
            })}
          </p>
        </motion.div>

        <div className="mt-8 flex-1">
          <div className="relative overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-white/10">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="aspect-[4/3] w-full object-cover object-center"
              />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 px-6 text-center">
                <Sparkles className="size-6 text-white/30" />
                <p className="text-[14px] text-white/40">
                  {t("aiStylePage.care.ingredientScan.placeholder", {
                    defaultValue: "Ingredients yozuvi aniq ko‘rinsin",
                  })}
                </p>
              </div>
            )}
            {busy ? (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-white" />
                  <p className="text-[13px] text-white/70">
                    {t("aiStylePage.care.ingredientScan.analyzing", {
                      defaultValue: "Tarkib tahlil qilinmoqda…",
                    })}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                try {
                  const { ensureCameraPermission } = await import("@/lib/native-camera");
                  const ok = await ensureCameraPermission();
                  if (!ok) return;
                } catch {
                  /* web */
                }
                cameraInputRef.current?.click();
              })();
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black disabled:opacity-50"
          >
            <Camera className="size-4" />
            {t("aiStylePage.openCamera", { defaultValue: "Kamera" })}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryInputRef.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/10 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Images className="size-4" />
            {t("aiStylePage.pickFromGallery", { defaultValue: "Galereya" })}
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void onPickFile(file);
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void onPickFile(file);
          }}
        />
      </div>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/ai-style"
      className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 touch-manipulation"
      aria-label={label}
    >
      <ChevronLeft className="size-5" strokeWidth={2.25} />
    </Link>
  );
}
