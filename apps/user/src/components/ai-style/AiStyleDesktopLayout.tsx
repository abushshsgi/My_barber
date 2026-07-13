import { useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ImagePlus, Loader2, ScanFace } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AiStyleSplitLayoutProps } from "@/components/ai-style/AiStyleSplitLayout";
import { AiStyleResultsBlock } from "@/components/ai-style/AiStyleResults";
import { AiStyleScanLine, GalleryValidatingHero } from "@/components/ai-style/AiStyleUi";
import { getAiStyleHeroUrl } from "@/lib/cover-images";
import { refreshAiStyleHistoryCache } from "@/lib/api";
import { FACE_HISTORY_UPDATED_EVENT, getActiveUserId, type FaceProfileHistoryEntry } from "@/lib/face-profile";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

const HERO_SLIDES: Record<"men" | "women", readonly string[]> = {
  men: ["hero-men", "hero-women"],
  women: ["hero-women", "hero-men"],
};
const SLIDE_MS = 5000;
const HISTORY_SLOTS = 6;

function DesktopBackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => navigateBack(router, "/", true)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/90 px-3 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-surface",
        className,
      )}
      aria-label="Orqaga"
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
      Orqaga
    </button>
  );
}

function DesktopStepRail({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [
    t("aiStylePage.steps.upload"),
    t("aiStylePage.steps.analyze"),
    t("aiStylePage.steps.results"),
  ];

  return (
    <div className="flex w-full items-start">
      {steps.map((label, index) => {
        const n = (index + 1) as 1 | 2 | 3;
        const done = step > n;
        const current = step === n;
        const reached = step >= n;

        return (
          <Fragment key={label}>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition-all",
                  reached ? "bg-foreground text-background" : "bg-surface text-muted-foreground",
                  current && "ring-4 ring-foreground/10",
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : n}
              </div>
              <p
                className={cn(
                  "text-center text-[11px] font-bold",
                  current ? "text-foreground" : reached ? "text-foreground/60" : "text-muted-foreground",
                )}
              >
                {label}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mt-[17px] h-0.5 w-full max-w-[64px] flex-1 rounded-full",
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

function DesktopHeroCarousel({ audience }: { audience: AiStyleSplitLayoutProps["audience"] }) {
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
    <div className="relative h-full w-full overflow-hidden rounded-[28px]">
      <AnimatePresence initial={false}>
        <motion.img
          key={`${audience}-${slides[index]}-${index}`}
          src={getAiStyleHeroUrl(slides[index])}
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1.08 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.8 }, scale: { duration: SLIDE_MS / 1000, ease: "linear" } }}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/25" />
      <div className="absolute bottom-6 left-6 right-6 flex gap-1.5">
        {slides.map((seed, i) => (
          <span
            key={`${seed}-${i}`}
            className={cn(
              "h-1 rounded-full transition-all",
              i === index ? "w-8 bg-white" : "w-2 bg-white/40",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function DesktopHistoryGrid() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FaceProfileHistoryEntry[]>([]);
  const userId = getActiveUserId();

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await refreshAiStyleHistoryCache();
      if (!cancelled) setEntries(list);
    };
    void refresh();
    const onCacheUpdate = () => {
      void refresh();
    };
    window.addEventListener(FACE_HISTORY_UPDATED_EVENT, onCacheUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(FACE_HISTORY_UPDATED_EVENT, onCacheUpdate);
    };
  }, [userId]);

  const slots = Array.from({ length: HISTORY_SLOTS }, (_, i) => entries[i] ?? null);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("aiStylePage.historyTitle")}
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">{t("aiStylePage.historySubtitle")}</p>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {slots.map((entry, i) => (
            <div
              key={entry?.id ?? `empty-${i}`}
              className="aspect-square overflow-hidden rounded-2xl border border-border/60 bg-surface"
            >
              {entry ? (
                <img src={entry.photoDataUrl} alt="" className="h-full w-full object-cover object-top" />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-foreground">{t("aiStylePage.historyEmpty")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("aiStylePage.historyEmptyHint")}</p>
        </div>
      )}
    </div>
  );
}

/** Desktop AI Style — ikki ustun: vizual + boshqaruv (swipe yo'q). */
export function AiStyleDesktopLayout(props: AiStyleSplitLayoutProps) {
  const { t } = useTranslation();
  const autoTryOn = Boolean(props.focusStyleId);
  const tryOnBusy = autoTryOn && props.tryOnLoadingId === props.focusStyleId;
  const busy = props.analyzing || props.validating || tryOnBusy;
  const showResults = props.done && !!props.result;
  const isPhotoPreview = !!props.photo && !showResults;
  const isUploadStep = !props.photo && !showResults;
  const isGalleryValidating = props.validating && !!props.validatingPreview;

  return (
    <div className="relative flex h-[calc(100dvh-4.25rem)] min-h-[640px] overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,oklch(0.94_0.02_85)_0%,transparent_50%),radial-gradient(ellipse_at_95%_40%,oklch(0.95_0.012_70)_0%,transparent_40%)]"
      />

      <div className="relative mx-auto grid h-full w-full max-w-[1360px] grid-cols-[minmax(0,0.92fr)_minmax(440px,1.08fr)] gap-6 px-6 py-5 xl:max-w-[1440px] xl:grid-cols-[minmax(0,0.88fr)_minmax(480px,1.12fr)] xl:gap-8 xl:px-10 xl:py-6">
        {/* Left visual */}
        <section className="relative flex min-h-0 items-center justify-center overflow-hidden">
          <div className="absolute left-0 top-0 z-20">
            <DesktopBackButton />
          </div>

          <div
            className={cn(
              "relative w-full overflow-hidden rounded-[28px] border border-border/50 bg-surface shadow-[0_20px_60px_-24px_rgba(15,15,15,0.25)]",
              isPhotoPreview || showResults
                ? "aspect-[3/4] max-h-full max-w-[min(100%,520px)]"
                : "h-full min-h-[420px]",
            )}
          >
            {isGalleryValidating ? (
              <GalleryValidatingHero previewUrl={props.validatingPreview!} />
            ) : isPhotoPreview || showResults ? (
              <div className="relative h-full w-full">
                <img
                  src={props.photo!}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
                {busy ? <AiStyleScanLine /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                {busy ? (
                  <div className="absolute inset-x-8 bottom-8">
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/45 px-5 py-4 text-sm font-bold text-white backdrop-blur-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {props.analyzing
                        ? t("aiStylePage.analyzing")
                        : tryOnBusy
                          ? t("aiStylePage.tryOnGenerating")
                          : t("aiStylePage.preparingPhoto")}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <DesktopHeroCarousel audience={props.audience} />
            )}
          </div>
        </section>

        {/* Right panel */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-border/60 bg-background/95 shadow-[0_12px_40px_-16px_rgba(15,15,15,0.12)] backdrop-blur-sm">
          <div className="shrink-0 border-b border-border/50 px-6 pb-4 pt-5 xl:px-7 xl:pb-5 xl:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("aiStylePage.title")}
                </p>
                <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground xl:text-[1.85rem]">
                  {showResults
                    ? t("aiStylePage.resultsTitle")
                    : isPhotoPreview
                      ? t("aiStylePage.photoReadyTitle")
                      : t("aiStylePage.uploadTitle")}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {showResults
                    ? t("aiStylePage.resultsHint")
                    : isPhotoPreview
                      ? t("aiStylePage.photoReadyDesc")
                      : t("aiStylePage.uploadHint")}
                </p>
              </div>
              {showResults ? (
                <button
                  type="button"
                  onClick={props.onReset}
                  className="shrink-0 rounded-full border border-border bg-background px-3.5 py-2 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-surface"
                >
                  {t("aiStylePage.tryAgain")}
                </button>
              ) : null}
            </div>
            <div className="mt-4 xl:mt-5">
              <DesktopStepRail step={props.step} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 xl:px-7 xl:py-6">
            {isUploadStep ? (
              <div className="flex h-full flex-col gap-8">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={props.validating}
                    onClick={props.openCamera}
                    className="flex min-h-[120px] flex-col items-center justify-center gap-2.5 rounded-[1.35rem] bg-foreground px-4 py-5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    <ScanFace className="h-7 w-7" strokeWidth={2} />
                    {t("aiStylePage.openCamera")}
                  </button>
                  <button
                    type="button"
                    disabled={props.validating}
                    onClick={props.openFile}
                    className="flex min-h-[120px] flex-col items-center justify-center gap-2.5 rounded-[1.35rem] border-2 border-dashed border-foreground/25 bg-surface/40 px-4 py-5 text-sm font-bold text-foreground transition-colors hover:bg-surface disabled:opacity-60"
                  >
                    <ImagePlus className="h-7 w-7" strokeWidth={2} />
                    {t("aiStylePage.pickFromGallery")}
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  {t("aiStylePage.introDesc")}
                </p>

                <div className="mt-auto border-t border-border/50 pt-6">
                  <DesktopHistoryGrid />
                </div>
              </div>
            ) : null}

            {isPhotoPreview ? (
              <div className="flex h-full flex-col justify-center gap-4">
                {busy ? (
                  <div className="rounded-2xl border border-border bg-surface/60 px-5 py-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-foreground" />
                    <p className="mt-4 text-sm font-bold text-foreground">
                      {props.analyzing
                        ? t("aiStylePage.analyzing")
                        : tryOnBusy
                          ? t("aiStylePage.tryOnGenerating")
                          : t("aiStylePage.preparingPhoto")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("aiStylePage.preparingPhotoHint")}
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={props.onAnalyze}
                      className="w-full rounded-[1.25rem] bg-foreground py-4 text-sm font-bold text-background transition-opacity hover:opacity-90"
                    >
                      {t("aiStylePage.analyzeCta")}
                    </button>
                    <button
                      type="button"
                      onClick={props.onReset}
                      className="w-full rounded-[1.25rem] border border-border py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-surface"
                    >
                      {t("aiStylePage.retake")}
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {showResults && props.result ? (
              <AiStyleResultsBlock
                result={props.result}
                saved={props.saved}
                onToggleSave={props.onToggleSave}
                onReset={props.onReset}
                layout="stack"
                variant="default"
                hideSectionTitle
                hideResetButton
                audience={props.audience}
                focusStyleId={props.focusStyleId}
                menPersonaId={props.menPersonaId}
                tryOnByStyle={props.tryOnByStyle}
                tryOnLoadingId={props.tryOnLoadingId}
                onGenerateTryOn={props.onGenerateTryOn}
              />
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
