import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AiStyleResultsBlock } from "@/components/ai-style/AiStyleResults";
import { AiStyleAnalyzeCta, AiStyleScanLine } from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { getTrendCoverUrl } from "@/lib/cover-images";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const HERO_SLIDES: Record<"men" | "women", readonly string[]> = {
  men: ["tr1", "tr3", "tr5", "tr1", "tr3"],
  women: ["tr2", "tr4", "tr6", "tr2", "tr4"],
};
const SLIDE_MS = 3800;

export type AiStyleSplitLayoutProps = {
  audience: Audience;
  step: 1 | 2 | 3;
  photo: string | null;
  validating: boolean;
  analyzing: boolean;
  done: boolean;
  result: AiAnalysisResult | null;
  saved: string[];
  onToggleSave: (id: string) => void;
  onReset: () => void;
  openFile: () => void;
  openCamera: () => void;
  onAnalyze: () => void;
};

function StepRail({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [
    t("aiStylePage.steps.upload"),
    t("aiStylePage.steps.analyze"),
    t("aiStylePage.steps.results"),
  ];

  return (
    <div className="flex items-start px-1">
      {steps.map((label, index) => {
        const n = (index + 1) as 1 | 2 | 3;
        const done = step > n;
        const current = step === n;
        const reached = step >= n;

        return (
          <Fragment key={label}>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold transition-all",
                  reached
                    ? "bg-foreground text-white shadow-sm"
                    : "border border-border bg-neutral-50 text-muted-foreground",
                  current && "ring-4 ring-foreground/10",
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : n}
              </div>
              <p
                className={cn(
                  "max-w-[72px] text-center text-[10px] font-bold leading-tight",
                  current
                    ? "text-foreground"
                    : reached
                      ? "text-foreground/70"
                      : "text-muted-foreground",
                )}
              >
                {label}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mt-4 h-0.5 w-full max-w-[48px] flex-1 rounded-full transition-colors",
                  step > n ? "bg-foreground" : "bg-border",
                )}
              />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

function HeroCarousel({ audience }: { audience: Audience }) {
  const { t } = useTranslation();
  const slides = HERO_SLIDES[audience === "women" ? "women" : "men"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [audience]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={`${audience}-${slides[index]}`}
          src={getTrendCoverUrl(slides[index])}
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />

      <div className="absolute inset-x-0 bottom-[4.5rem] flex flex-col items-center gap-2.5 px-6 text-center text-white">
        <p className="text-lg font-bold drop-shadow-sm">{t("aiStylePage.uploadTitle")}</p>
        <p className="max-w-[260px] text-xs text-white/85">{t("aiStylePage.uploadHint")}</p>
        <div className="flex gap-1.5">
          {slides.map((seed, i) => (
            <span
              key={`${seed}-${i}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/40",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SelfieFaceShape() {
  return (
    <div className="relative grid h-6 w-6 place-items-center rounded-lg border-2 border-white/70">
      <div
        className="h-3.5 w-2.5 border-2 border-white/80"
        style={{ borderRadius: "50% 50% 42% 42%" }}
      />
      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-white/90" />
    </div>
  );
}

function GalleryStackShape() {
  return (
    <div className="relative h-6 w-6">
      <span className="absolute bottom-0 left-0 h-4 w-3 rounded-[4px] border border-foreground/25 bg-foreground/10 rotate-[-10deg]" />
      <span className="absolute bottom-0 right-0 h-4 w-3 rounded-[4px] border border-foreground/30 bg-foreground/15 rotate-[8deg]" />
      <span className="absolute left-1/2 top-0 h-4 w-3 -translate-x-1/2 rounded-[4px] border border-foreground/40 bg-foreground/20" />
    </div>
  );
}

function UploadActions({
  onOpenCamera,
  onOpenGallery,
  validating,
}: {
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  validating?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        disabled={validating}
        onClick={onOpenCamera}
        className="inline-flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-2xl bg-foreground px-2.5 py-3 text-[12px] font-bold leading-tight text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.3)] active:scale-[0.98] disabled:opacity-60"
      >
        <SelfieFaceShape />
        {t("aiStylePage.openCamera")}
      </button>
      <button
        type="button"
        disabled={validating}
        onClick={onOpenGallery}
        className="inline-flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-foreground/20 bg-transparent px-2.5 py-3 text-[12px] font-bold leading-tight text-foreground active:scale-[0.98] disabled:opacity-60"
      >
        <GalleryStackShape />
        {t("aiStylePage.pickFromGallery")}
      </button>
    </div>
  );
}

export function AiStyleSplitLayout(props: AiStyleSplitLayoutProps) {
  const { t } = useTranslation();
  const busy = props.analyzing || props.validating;
  const showResults = props.done && !!props.result;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white">
      <div
        className={cn(
          "relative overflow-hidden",
          !props.photo && "min-h-0 flex-1",
          props.photo && !showResults && "h-[44dvh] shrink-0",
          showResults && "h-[24dvh] shrink-0",
        )}
      >
        {props.photo ? (
          <>
            <img src={props.photo} alt="" className="h-full w-full object-cover object-top" />
            {busy ? <AiStyleScanLine /> : null}
          </>
        ) : (
          <HeroCarousel audience={props.audience} />
        )}
        <Link
          to="/profile"
          className="absolute left-5 top-[calc(env(safe-area-inset-top)+12px)] z-10 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 36, stiffness: 170, mass: 1.15 }}
        className={cn(
          "relative z-10 -mt-10 shrink-0 rounded-t-[28px] bg-white px-5 pb-5 pt-5 text-foreground shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.28)]",
          showResults && "min-h-0 flex-1 overflow-y-auto pb-6",
        )}
      >
        <StepRail step={props.step} />

        {!props.photo ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5, ease: "easeOut" }}
            className="mt-5 space-y-3"
          >
            <UploadActions
              onOpenCamera={props.openCamera}
              onOpenGallery={props.openFile}
              validating={props.validating}
            />
            <p className="text-center text-[11px] text-muted-foreground">
              {t("aiStylePage.privacyNote")}
            </p>
          </motion.div>
        ) : props.done && props.result ? (
          <div className="mt-5">
            <AiStyleResultsBlock
              result={props.result}
              saved={props.saved}
              onToggleSave={props.onToggleSave}
              onReset={props.onReset}
              layout="carousel"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold">{t("aiStylePage.photoReadyTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("aiStylePage.photoReadyDesc")}</p>
            <button
              type="button"
              onClick={props.onReset}
              className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold"
            >
              {t("aiStylePage.retake")}
            </button>
            <AiStyleAnalyzeCta
              analyzing={props.analyzing}
              validating={props.validating}
              onAnalyze={props.onAnalyze}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
