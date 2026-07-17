import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarPlus, Camera, Check, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { Fragment, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStylePhotoInput, AiStyleScanLine } from "@/components/ai-style/AiStyleUi";
import { MorphStudioPanel } from "@/components/ai-style/MorphStudioPanel";
import { HairstylePreviewFrame, HairstylePreviewImage } from "@/components/hairstyles/HairstylePreviewImage";
import type { useStyleTryOnFlow } from "@/components/style-try-on/useStyleTryOnFlow";
import type { HairstyleEntry } from "@/lib/hairstyles/catalog";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

type Flow = ReturnType<typeof useStyleTryOnFlow>;

type Props = {
  flow: Flow;
  entry: HairstyleEntry;
};

type Step = 1 | 2 | 3;

function resolveStep(flow: Flow): Step {
  if (flow.tryOnPreview) return 3;
  if (flow.photo && (flow.validating || flow.generating)) return 2;
  if (flow.photo && flow.error && !flow.generating) return 2;
  return 1;
}

function StepRail({ step }: { step: Step }) {
  const { t } = useTranslation();
  const steps = [
    t("styleTryOnPage.steps.upload"),
    t("styleTryOnPage.steps.generate"),
    t("styleTryOnPage.steps.result"),
  ];

  return (
    <div className="flex items-start px-1">
      {steps.map((label, index) => {
        const n = (index + 1) as Step;
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
                  current ? "text-foreground" : reached ? "text-foreground/70" : "text-muted-foreground",
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

function StylePreviewCard({ entry }: { entry: HairstyleEntry }) {
  const { t } = useTranslation();

  return (
    <HairstylePreviewFrame>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <HairstylePreviewImage
          src={getHairstyleImageUrl(entry)}
          alt={entry.titleUz}
          variant="card"
          badge={
            <span className="rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">
              {t("explorePage.sampleBadge")}
            </span>
          }
        />
        <div className="border-t border-border/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("styleTryOnPage.selectedStyle")}
          </p>
          <p className="mt-0.5 text-base font-bold leading-tight">{entry.titleUz}</p>
        </div>
      </div>
    </HairstylePreviewFrame>
  );
}

function GeneratingOverlay({
  photo,
  entry,
  validating,
  generating,
}: {
  photo: string;
  entry: HairstyleEntry;
  validating: boolean;
  generating: boolean;
}) {
  const { t } = useTranslation();
  const message = validating
    ? t("styleTryOnPage.preparingPhoto")
    : t("styleTryOnPage.generating", { style: entry.titleUz });

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-black">
      <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-80" />
      <AiStyleScanLine />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      <div
        className="absolute inset-x-5 z-10"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.08] backdrop-blur-2xl">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/30">
              <img
                src={getHairstyleImageUrl(entry)}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">{message}</p>
              <p className="mt-1 text-xs text-white/65">{t("styleTryOnPage.generatingHint")}</p>
            </div>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white" />
          </div>
          <div className="px-5 pb-4">
            <div className="h-1 overflow-hidden rounded-full bg-white/12">
              <motion.div
                className="h-full rounded-full bg-white"
                animate={{ width: validating ? "35%" : generating ? ["35%", "85%", "60%"] : "100%" }}
                transition={{
                  duration: validating ? 0.4 : 2.2,
                  repeat: generating ? Infinity : 0,
                  ease: "easeInOut",
                }}
                style={{ width: validating ? "35%" : undefined }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({
  entry,
  preview,
  onPreviewChange,
  onReset,
}: {
  entry: HairstyleEntry;
  preview: string;
  onPreviewChange: (next: string) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img
          src={preview}
          alt={entry.titleUz}
          className="h-full w-full object-cover object-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        <div
          className="absolute left-0 right-0 top-0 px-5 pt-[max(0.75rem,env(safe-area-inset-top))]"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
            {t("styleTryOnPage.resultTitle")}
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-white drop-shadow-sm">{entry.titleUz}</h2>
        </div>
      </div>

      <div
        className="shrink-0 space-y-3 overflow-y-auto border-t border-white/10 bg-[#0a0a0a] px-4 pt-3"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <MorphStudioPanel
          image={preview}
          onImageChange={onPreviewChange}
          styleId={entry.id}
          styleTitle={entry.titleUz}
          tone="dark"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-black/30 py-3.5 text-xs font-bold text-white backdrop-blur-md"
          >
            <RotateCcw className="h-4 w-4" />
            {t("styleTryOnPage.retry")}
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-xs font-bold text-black"
          >
            <CalendarPlus className="h-4 w-4" />
            {t("styleTryOnPage.findSalon")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-bold text-destructive">{t("styleTryOnPage.errorTitle")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-foreground py-2.5 text-xs font-bold text-background"
        >
          {t("styleTryOnPage.retry")}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-border py-2.5 text-xs font-bold"
        >
          {t("styleTryOnPage.newPhoto")}
        </button>
      </div>
    </div>
  );
}

export function StyleTryOnFlow({ flow, entry }: Props) {
  const { t } = useTranslation();
  const step = resolveStep(flow);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    if (flow.error && !flow.generating && !flow.validating) {
      toast.error(flow.error);
    }
  }, [flow.error, flow.generating, flow.validating]);

  if (flow.tryOnPreview) {
    return (
      <>
        <ResultView
          entry={entry}
          preview={flow.tryOnPreview}
          onPreviewChange={flow.setTryOnPreview}
          onReset={flow.reset}
        />
        <AiStylePhotoInput fileRef={flow.fileRef} onFile={flow.onFile} />
        <AiStyleCamera open={flow.cameraOpen} onClose={flow.closeCamera} onCapture={flow.onCameraCapture} />
      </>
    );
  }

  if (flow.photo && (flow.validating || flow.generating)) {
    return (
      <>
        <GeneratingOverlay
          photo={flow.validatingPreview ?? flow.photo}
          entry={entry}
          validating={flow.validating}
          generating={flow.generating}
        />
        <AiStylePhotoInput fileRef={flow.fileRef} onFile={flow.onFile} />
        <AiStyleCamera open={flow.cameraOpen} onClose={flow.closeCamera} onCapture={flow.onCameraCapture} />
      </>
    );
  }

  if (flow.photo && flow.error) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background">
        <div className="relative aspect-[3/4] shrink-0 overflow-hidden">
          <img src={flow.photo} alt="" className="h-full w-full object-cover object-top" />
        </div>
        <div className="flex flex-1 flex-col px-5 py-5">
          <StepRail step={2} />
          <div className="mt-5 flex-1">
            <ErrorPanel message={flow.error} onRetry={flow.retryGeneration} onReset={flow.reset} />
          </div>
        </div>
        <AiStylePhotoInput fileRef={flow.fileRef} onFile={flow.onFile} />
        <AiStyleCamera open={flow.cameraOpen} onClose={flow.closeCamera} onCapture={flow.onCameraCapture} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom)+1rem)] lg:pb-8">
      <div className="px-5 pt-2">
        <h1 className="text-xl font-bold leading-tight">{t("styleTryOnPage.headline")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("styleTryOnPage.uploadHint")}</p>
      </div>

      <div className="mt-5 px-5">
        <StylePreviewCard entry={entry} />
      </div>

      <div className="mt-6 flex-1 px-5">
        <StepRail step={step} />
        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={flow.openCamera}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-bold text-background"
          >
            <Camera className="h-4 w-4" />
            {t("aiStylePage.openCamera")}
          </button>
          <button
            type="button"
            onClick={flow.openFile}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 text-sm font-bold"
          >
            <ImagePlus className="h-4 w-4" />
            {t("aiStylePage.pickFromGallery")}
          </button>
        </div>
      </div>

      <AiStylePhotoInput fileRef={flow.fileRef} onFile={flow.onFile} />
      <AiStyleCamera open={flow.cameraOpen} onClose={flow.closeCamera} onCapture={flow.onCameraCapture} />
    </div>
  );
}
