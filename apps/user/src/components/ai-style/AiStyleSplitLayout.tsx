import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
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
    <div className="flex items-center gap-2">
      {steps.map((label, index) => {
        const n = (index + 1) as 1 | 2 | 3;
        const active = step >= n;
        const current = step === n;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                active ? "bg-foreground" : "bg-border",
                current && "ring-2 ring-foreground/20 ring-offset-2 ring-offset-white",
              )}
            />
            <p
              className={cn(
                "truncate text-[9px] font-bold uppercase tracking-wide",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </p>
          </div>
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
    <div className="relative h-[58vh] min-h-[320px] w-full overflow-hidden">
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
    <div className="rounded-[20px] border border-border bg-background p-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={validating}
          onClick={onOpenCamera}
          className="inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-foreground px-4 py-4 text-[15px] font-bold text-background active:scale-[0.98] disabled:opacity-60"
        >
          <Camera className="h-5 w-5 shrink-0" />
          {t("aiStylePage.openCamera")}
        </button>
        <button
          type="button"
          disabled={validating}
          onClick={onOpenGallery}
          className="inline-flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-4 text-[15px] font-bold active:scale-[0.98] disabled:opacity-60"
        >
          <ImagePlus className="h-5 w-5 shrink-0" />
          {t("aiStylePage.pickFromGallery")}
        </button>
      </div>
    </div>
  );
}

export function AiStyleSplitLayout(props: AiStyleSplitLayoutProps) {
  const { t } = useTranslation();
  const busy = props.analyzing || props.validating;

  return (
    <div className="relative flex min-h-full flex-col bg-foreground pb-[calc(68px+env(safe-area-inset-bottom))]">
      <div className="relative shrink-0">
        {props.photo ? (
          <>
            <img
              src={props.photo}
              alt=""
              className="h-[58vh] min-h-[320px] w-full object-cover object-top"
            />
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
        transition={{ type: "spring", damping: 28, stiffness: 280, mass: 0.9 }}
        className="relative z-10 -mt-10 shrink-0 rounded-t-[28px] bg-white px-5 pb-6 pt-5 text-foreground shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.28)]"
      >
        <StepRail step={props.step} />

        {!props.photo ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
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
