import { Link, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Images,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { navigateBack } from "@/lib/mobile-back";
import { useIngredientScan } from "@/hooks/use-ingredient-scan";
import { useHairCareProfile, useUpdateHairCareProfile } from "@/hooks/use-hair-care-profile";
import { fetchCareAccess } from "@/lib/api/subscriptions";
import type { IngredientScanResponse } from "@/lib/api/ai";
import type {
  HairColorStatus,
  HairCondition,
  HairTexture,
} from "@/lib/api/hair-care-profile";
import { prepareSelfieFromFile } from "@/lib/selfie-image";
import { cn } from "@/lib/utils";

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: HairColorStatus[] = ["natural", "colored", "bleached"];

type QuizStep = 0 | 1 | 2;
type Screen = "quiz" | "capture" | "result";

const ease = [0.22, 1, 0.36, 1] as const;

const VERDICT_TONE: Record<string, string> = {
  good: "text-emerald-300",
  caution: "text-amber-300",
  bad: "text-orange-300",
  dangerous: "text-rose-300",
};

export function MorphAiIngredientScanPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const reduce = useReducedMotion();
  const accessQ = useQuery({
    queryKey: ["subscriptions", "care-access"],
    queryFn: fetchCareAccess,
    staleTime: 30_000,
  });
  const hairQ = useHairCareProfile();
  const updateHair = useUpdateHairCareProfile();
  const scan = useIngredientScan();

  const [condition, setCondition] = useState<HairCondition | null>(null);
  const [texture, setTexture] = useState<HairTexture | null>(null);
  const [colorStatus, setColorStatus] = useState<HairColorStatus | null>(null);
  const [quizStep, setQuizStep] = useState<QuizStep>(0);
  const [forceQuiz, setForceQuiz] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<IngredientScanResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const profileComplete = Boolean(hairQ.data?.complete);
  const screen: Screen = result
    ? "result"
    : forceQuiz || (!profileComplete && !hairQ.isLoading)
      ? "quiz"
      : "capture";

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
            {t("aiStylePage.care.ingredientScan.badge", { defaultValue: "Tarkib skani" })}
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

  const finishQuiz = async () => {
    if (!condition || !texture || !colorStatus) return;
    try {
      await updateHair.mutateAsync({
        condition,
        texture,
        color_status: colorStatus,
      });
      setForceQuiz(false);
      toast.success(
        t("aiStylePage.care.ingredientScan.profileSaved", {
          defaultValue: "Soch profilingiz saqlandi",
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
        title: t("aiStylePage.care.quiz.conditionQ", { defaultValue: "Soch holati?" }),
        options: CONDITION_OPTS.map((value) => ({
          value,
          label: t(`aiStylePage.care.conditions.${value}`, { defaultValue: value }),
        })),
        selected: condition,
        onPick: (v: string) => setCondition(v as HairCondition),
      },
      {
        title: t("aiStylePage.care.quiz.textureQ", { defaultValue: "Tekstura?" }),
        options: TEXTURE_OPTS.map((value) => ({
          value,
          label: t(`aiStylePage.care.textures.${value}`, { defaultValue: value }),
        })),
        selected: texture,
        onPick: (v: string) => setTexture(v as HairTexture),
      },
      {
        title: t("aiStylePage.care.quiz.colorQ", { defaultValue: "Rang?" }),
        options: COLOR_OPTS.map((value) => ({
          value,
          label: t(`aiStylePage.care.colors.${value}`, { defaultValue: value }),
        })),
        selected: colorStatus,
        onPick: (v: string) => setColorStatus(v as HairColorStatus),
      },
    ] as const;
    const current = questions[quizStep];
    const canNext =
      quizStep === 0 ? Boolean(condition) : quizStep === 1 ? Boolean(texture) : Boolean(colorStatus);
    const progress = ((quizStep + 1) / questions.length) * 100;

    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#FAFAFA] text-[#111111]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.07),transparent_65%)]" />
        <div
          className="relative z-[1] flex min-h-[100dvh] flex-col px-5 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <BackLink label={t("common.back")} />
          <p className="mt-6 text-[12px] font-medium tracking-wide text-[#111111]/35">
            {t("aiStylePage.care.ingredientScan.hairProfile", { defaultValue: "Soch profili" })}
          </p>
          <h1 className="mt-2 max-w-[18rem] text-[1.45rem] font-semibold leading-[1.12] tracking-tight">
            {current.title}
          </h1>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#F0F0F0]">
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
                        : "bg-[#F0F0F0] text-[#111111] active:bg-[#F0F0F0]",
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
                className="h-12 flex-1 rounded-full bg-[#F0F0F0] text-sm font-semibold"
              >
                {t("common.back")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!canNext || updateHair.isPending}
              onClick={() => {
                if (quizStep === 2) void finishQuiz();
                else setQuizStep((s) => (s + 1) as QuizStep);
              }}
              className="h-12 flex-[1.6] rounded-full bg-[#111111] text-sm font-semibold text-white disabled:opacity-40"
            >
              {updateHair.isPending ? (
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
    const verdict = result.verdict || result.verdict_key || "";
    const scoreColor = VERDICT_TONE[verdict] || (score >= 70 ? "text-emerald-300" : score >= 45 ? "text-amber-300" : "text-rose-300");
    const matched = result.matched_product;

    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#FAFAFA] text-[#111111]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.07),transparent_65%)]" />
        <div
          className="relative z-[1] px-5 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <BackLink label={t("common.back")} />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mt-8"
          >
            <p className="text-[12px] font-medium tracking-wide text-[#111111]/35">
              {t("aiStylePage.care.ingredientScan.badge", { defaultValue: "Tarkib skani" })}
            </p>
            <div className="mt-3 flex items-end gap-3">
              <p className={cn("text-5xl font-semibold tracking-tight", scoreColor)}>{score}</p>
              <p className="mb-1.5 text-sm text-[#111111]/45">/ 100</p>
            </div>
            {verdict ? (
              <p className={cn("mt-2 text-[13px] font-semibold uppercase tracking-wide", scoreColor)}>
                {t(`aiStylePage.care.verdicts.${verdict}`, {
                  defaultValue:
                    verdict === "good"
                      ? "Yaxshi"
                      : verdict === "caution"
                        ? "Ehtiyot"
                        : verdict === "bad"
                          ? "Yomon"
                          : "Xavfli",
                })}
              </p>
            ) : null}
            <p className="mt-2 max-w-[22rem] text-[15px] leading-relaxed text-[#111111]/75">
              {result.fit_uz || result.product_analysis.verdict}
            </p>
            {result.catalog_notes_uz ? (
              <p className="mt-2 max-w-[22rem] text-[12px] leading-relaxed text-[#111111]/40">
                {result.catalog_notes_uz}
              </p>
            ) : null}
            <p className="mt-2 text-[12px] text-[#111111]/35">
              {t("aiStylePage.care.ingredientScan.ingredientsCount", {
                defaultValue: "{{count}} ta modda",
                count: result.product_analysis.total_ingredients_count,
              })}
            </p>
          </motion.div>

          {matched ? (
            <Link
              to="/ai-style/care/products/$productId"
              params={{ productId: String(matched.id) }}
              className="mt-8 block rounded-2xl bg-[#F0F0F0] px-3.5 py-3.5 ring-1 ring-black/10"
            >
              <p className="text-[11px] text-[#111111]/35">
                {t("aiStylePage.care.catalog.match", { defaultValue: "Katalogdagi mahsulot" })}
              </p>
              <p className="mt-1 text-[15px] font-semibold">{matched.name}</p>
              {matched.brand ? <p className="text-[12px] text-[#111111]/45">{matched.brand}</p> : null}
              {matched.purpose_uz ? (
                <p className="mt-2 text-[13px] text-[#111111]/55">{matched.purpose_uz}</p>
              ) : null}
              {matched.warnings_uz ? (
                <p className="mt-2 text-[12px] leading-snug text-amber-800/70">
                  {matched.warnings_uz}
                </p>
              ) : null}
            </Link>
          ) : null}

          {result.critical_alerts.length > 0 ? (
            <section className="mt-9">
              <h2 className="mb-3 text-[12px] font-medium tracking-wide text-[#111111]/35">
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
                      <p className="mt-0.5 text-[14px] leading-snug text-[#111111]/80">
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
              <h2 className="mb-3 text-[12px] font-medium tracking-wide text-[#111111]/35">
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
                      <p className="mt-0.5 text-[14px] leading-snug text-[#111111]/80">
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
            className="mt-10 flex h-12 w-full items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white active:scale-[0.98]"
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
    <IngredientScanCapture
      busy={busy}
      previewUrl={previewUrl}
      onPickFile={onPickFile}
      onEditProfile={() => {
        setCondition(
          hairQ.data?.condition && hairQ.data.condition !== "" ? hairQ.data.condition : null,
        );
        setTexture(
          hairQ.data?.texture && hairQ.data.texture !== "" ? hairQ.data.texture : null,
        );
        setColorStatus(
          hairQ.data?.color_status && hairQ.data.color_status !== ""
            ? hairQ.data.color_status
            : null,
        );
        setQuizStep(0);
        setForceQuiz(true);
      }}
    />
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function openLabelCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    { audio: false, video: { facingMode: "environment" } },
    { audio: false, video: true },
  ];
  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Camera unavailable");
}

function captureVideoFrame(video: HTMLVideoElement): string | null {
  if (video.videoWidth < 8 || video.videoHeight < 8) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function ScanCorners() {
  const arm = "h-8 w-8 border-white";
  return (
    <div
      className="pointer-events-none absolute inset-x-[12%] z-[2]"
      style={{ top: "12%", bottom: "42%" }}
      aria-hidden
    >
      <span className={cn("absolute left-0 top-0 rounded-tl-xl border-l-[3.5px] border-t-[3.5px]", arm)} />
      <span className={cn("absolute right-0 top-0 rounded-tr-xl border-r-[3.5px] border-t-[3.5px]", arm)} />
      <span className={cn("absolute bottom-0 left-0 rounded-bl-xl border-b-[3.5px] border-l-[3.5px]", arm)} />
      <span className={cn("absolute bottom-0 right-0 rounded-br-xl border-b-[3.5px] border-r-[3.5px]", arm)} />
    </div>
  );
}

function IngredientScanCapture({
  busy,
  previewUrl,
  onPickFile,
  onEditProfile,
}: {
  busy: boolean;
  previewUrl: string | null;
  onPickFile: (file: File | undefined) => Promise<void>;
  onEditProfile: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stream = await openLabelCamera();
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (!cancelled) setLive(true);
      } catch {
        if (!cancelled) setLive(false);
      }
    })();
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, []);

  const onNext = () => {
    if (busy) return;
    const frame = videoRef.current ? captureVideoFrame(videoRef.current) : null;
    if (frame) {
      void (async () => {
        const res = await fetch(frame);
        const blob = await res.blob();
        const file = new File([blob], "label.jpg", { type: "image/jpeg" });
        await onPickFile(file);
      })();
      return;
    }
    cameraInputRef.current?.click();
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black text-[#111111]">
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 size-full object-cover",
          previewUrl || !live ? "opacity-0" : "opacity-100",
        )}
        muted
        playsInline
        autoPlay
      />
      {previewUrl ? (
        <img src={previewUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : null}
      {!previewUrl && !live ? <div className="absolute inset-0 bg-[#1a1a1a]" /> : null}

      <ScanCorners />

      <button
        type="button"
        onClick={() => navigateBack(router, "/ai-style/care")}
        aria-label={t("common.back")}
        className="absolute right-4 z-[3] grid size-10 place-items-center rounded-full bg-black/45 text-[#111111] cursor-pointer"
        style={{ top: "max(0.85rem, env(safe-area-inset-top))" }}
      >
        <X className="size-5" strokeWidth={2.25} />
      </button>

      {busy ? (
        <div className="absolute inset-0 z-[4] grid place-items-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-[#111111]" />
            <p className="text-[13px] text-[#111111]/80">
              {t("aiStylePage.care.ingredientScan.analyzing", {
                defaultValue: "Tarkib tahlil qilinmoqda…",
              })}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className="absolute inset-x-0 bottom-0 z-[3] rounded-t-[2rem] bg-white px-6 pt-7 text-black"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <h1 className="text-[1.45rem] font-semibold leading-[1.18] tracking-tight">
          {t("aiStylePage.care.ingredientScan.title", {
            defaultValue: "Mahsulotni skan qiling",
          })}
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#757575]">
          {t("aiStylePage.care.ingredientScan.subtitle", {
            defaultValue:
              "Uni «Mening mahsulotlarim» ro‘yxatiga qo‘shishingiz mumkin. Tarkib yozuvini ramka ichiga joylashtiring — AI formulani darhol tahlil qiladi.",
          })}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onNext}
          className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-[#F2F2F2] text-[16px] font-semibold text-black disabled:opacity-50"
        >
          {t("common.next")}
        </button>
        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 py-2 text-[13px] font-medium text-[#757575]"
          >
            <Images className="size-4" />
            {t("aiStylePage.pickFromGallery", { defaultValue: "Galereya" })}
          </button>
          <button
            type="button"
            onClick={onEditProfile}
            className="py-2 text-[13px] font-medium text-[#757575]"
          >
            {t("aiStylePage.care.ingredientScan.editProfile", { defaultValue: "Profil" })}
          </button>
        </div>
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
  );
}

function BackLink({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => navigateBack(router, "/ai-style/care")}
      className="inline-flex size-11 items-center justify-center rounded-full bg-[#F0F0F0] touch-manipulation cursor-pointer active:scale-95 transition-transform"
      aria-label={label}
    >
      <ChevronLeft className="size-5" strokeWidth={2.25} />
    </button>
  );
}
