import { Link, useRouter } from "@tanstack/react-router";
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, ChevronsUp, Loader2, ScanFace, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AiStyleResultsBlock } from "@/components/ai-style/AiStyleResults";
import { AiStyleScanLine, GalleryValidatingHero } from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { getAiStyleHeroUrl } from "@/lib/cover-images";
import { refreshAiStyleHistoryCache } from "@/lib/api";
import { FACE_HISTORY_UPDATED_EVENT, getActiveUserId, type FaceProfileHistoryEntry } from "@/lib/face-profile";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import type { Audience } from "@/lib/mock-data";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

const HERO_SLIDES: Record<"men" | "women", readonly string[]> = {
  men: ["hero-men", "hero-women"],
  women: ["hero-women", "hero-men"],
};
const SLIDE_MS = 4500;
const UPLOAD_PANEL_HEIGHT = 240;
const UPLOAD_HISTORY_REVEAL_RATIO = 0.48;
const HISTORY_HINT_MS = 6000;
const HISTORY_HINT_NUDGE_MS = 1500;
const HISTORY_HINT_NUDGE_OFFSET = -14;
const HERO_TEXT_ABOVE_PANEL = 22;

function AiStyleBackButton({
  className,
  onClick,
  label,
}: {
  className?: string;
  onClick?: () => void;
  label?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => (onClick ? onClick() : navigateBack(router, "/"))}
      className={cn(
        "absolute left-5 top-[calc(env(safe-area-inset-top)+12px)] z-10 grid size-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md active:opacity-80",
        className,
      )}
      aria-label={label ?? t("common.back")}
    >
      <ChevronLeft className="size-5" strokeWidth={2.25} />
    </button>
  );
}

function getHistoryRevealHeight() {
  if (typeof window === "undefined") return 400;
  return Math.round(window.innerHeight * UPLOAD_HISTORY_REVEAL_RATIO);
}

export type AiStyleSplitLayoutProps = {
  audience: Audience;
  step: 1 | 2 | 3;
  photo: string | null;
  validatingPreview: string | null;
  validating: boolean;
  analyzing: boolean;
  done: boolean;
  result: AiAnalysisResult | null;
  focusStyleId?: string;
  saved: string[];
  onToggleSave: (styleId: string, meta?: { title: string; previewImage?: string }) => void;
  onReset: () => void;
  onGoHome?: () => void;
  openFile: () => void;
  openCamera: () => void;
  onAnalyze: () => void;
  tryOnByStyle: Record<string, string>;
  tryOnLoadingId: string | null;
  onGenerateTryOn: (styleId: string, personaId?: ExplorePersonaId) => void;
  menPersonaId?: ExplorePersonaId | null;
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
                    ? "bg-black text-white"
                    : "bg-neutral-100 text-neutral-400",
                  current && "ring-4 ring-black/8",
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : n}
              </div>
              <p
                className={cn(
                  "max-w-[72px] text-center text-[10px] font-bold leading-tight",
                  current ? "text-black" : reached ? "text-black/60" : "text-neutral-400",
                )}
              >
                {label}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mt-4 h-0.5 w-full max-w-[48px] flex-1 rounded-full transition-colors",
                  step > n ? "bg-black" : "bg-neutral-200",
                )}
              />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

function ResultsHero({ photo }: { photo: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={photo}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/85 via-black/55 to-transparent"
      />
    </div>
  );
}

function HeroCarousel({ audience, hintActive }: { audience: Audience; hintActive: boolean }) {
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

  const slideDuration = SLIDE_MS / 1000;
  const panDirection = index % 2 === 0 ? -1 : 1;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.img
          key={`${audience}-${slides[index]}-${index}`}
          src={getAiStyleHeroUrl(slides[index])}
          alt=""
          initial={{ opacity: 0, scale: 1.06, x: `${panDirection * -1.5}%` }}
          animate={{ opacity: 1, scale: 1.12, x: `${panDirection * 1.5}%` }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.9, ease: "easeInOut" },
            scale: { duration: slideDuration, ease: "linear" },
            x: { duration: slideDuration, ease: "linear" },
          }}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/85 via-black/55 to-transparent"
      />

      <div
        className="absolute inset-x-0 z-[1] flex flex-col items-center gap-2 px-6 text-center text-white transition-[bottom] duration-[450ms] ease-out"
        style={{ bottom: hintActive ? "5.5rem" : `${HERO_TEXT_ABOVE_PANEL}px` }}
      >
        <p className="text-lg font-bold">{t("aiStylePage.uploadTitle")}</p>
        <p className="max-w-[260px] text-xs text-white/90">{t("aiStylePage.uploadHint")}</p>
        <div className="mt-1 flex justify-center gap-1.5">
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
    <div className="flex justify-center gap-10">
      <button
        type="button"
        disabled={validating}
        onClick={onOpenCamera}
        onPointerDown={(event) => event.stopPropagation()}
        className="inline-flex w-[9.5rem] min-h-[50px] flex-col items-center justify-center gap-1 rounded-2xl bg-foreground px-2 py-3 text-[12px] font-bold leading-tight text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.3)] active:scale-[0.98] disabled:opacity-60"
      >
        <ScanFace className="h-6 w-6" strokeWidth={2} />
        {t("aiStylePage.openCamera")}
      </button>
      <button
        type="button"
        disabled={validating}
        onClick={onOpenGallery}
        onPointerDown={(event) => event.stopPropagation()}
        className="inline-flex w-[9.5rem] min-h-[50px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-foreground/20 bg-transparent px-2 py-3 text-[12px] font-bold leading-tight text-foreground active:scale-[0.98] disabled:opacity-60"
      >
        <GalleryStackShape />
        {t("aiStylePage.pickFromGallery")}
      </button>
    </div>
  );
}

function HistorySwipeHint({ visible }: { visible: boolean }) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="history-swipe-hint"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="pointer-events-none flex flex-col items-center gap-1.5"
        >
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.9, ease: "easeInOut", times: [0, 0.45, 1] }}
          >
            <ChevronsUp className="h-6 w-6 text-white drop-shadow-md" strokeWidth={2.25} />
          </motion.div>
          <p className="max-w-[220px] text-center text-[11px] font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
            {t("aiStylePage.historySwipeHint")}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function useHistorySwipeHint(isUploadStep: boolean, historyOpen: boolean) {
  const [hintDismissed, setHintDismissed] = useState(false);

  useEffect(() => {
    if (!isUploadStep) {
      setHintDismissed(false);
      return;
    }

    if (historyOpen) {
      setHintDismissed(true);
      return;
    }

    setHintDismissed(false);
    const hideTimer = window.setTimeout(() => setHintDismissed(true), HISTORY_HINT_MS);
    return () => window.clearTimeout(hideTimer);
  }, [isUploadStep, historyOpen]);

  return isUploadStep && !historyOpen && !hintDismissed;
}

function UploadHistorySheet({ open }: { open: boolean }) {
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void refreshAiStyleHistoryCache().then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  return (
    <div className="flex h-full flex-col pb-6 pt-1">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("aiStylePage.historyTitle")}
          </p>
          <p className="mt-1 text-base font-bold text-foreground">{t("aiStylePage.historySubtitle")}</p>
        </div>
        {entries.length > 0 ? (
          <Link
            to="/ai-style/history"
            className="inline-flex items-center gap-0.5 text-xs font-bold text-foreground"
          >
            {t("aiStylePage.historyViewAll", { defaultValue: "Hammasi" })}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {entries.length > 0 ? (
        <Link
          to="/ai-style/history"
          className="mt-4 block min-h-0 flex-1 outline-none"
          aria-label={t("aiStylePage.historyButton")}
        >
          <div className="flex max-h-full gap-2.5 overflow-x-auto pb-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-neutral-100"
              >
                <img
                  src={entry.photoDataUrl}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
            {t("aiStylePage.historyOpenHint", {
              defaultValue: "Bosib to'liq tarixni oching · gorizontal suring",
            })}
          </p>
        </Link>
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-neutral-50/80 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-foreground">{t("aiStylePage.historyEmpty")}</p>
          <p className="mt-1 max-w-[240px] text-[11px] text-muted-foreground">
            {t("aiStylePage.historyEmptyHint")}
          </p>
        </div>
      )}
    </div>
  );
}

export function AiStyleSplitLayout(props: AiStyleSplitLayoutProps) {
  const { t } = useTranslation();
  const autoTryOn = Boolean(props.focusStyleId);
  const tryOnBusy = autoTryOn && props.tryOnLoadingId === props.focusStyleId;
  const busy = props.analyzing || props.validating || tryOnBusy;
  const showResults = props.done && !!props.result;
  const isPhotoPreview = !!props.photo && !showResults;
  const isUploadStep = !props.photo && !showResults;
  const [historyRevealHeight, setHistoryRevealHeight] = useState(getHistoryRevealHeight);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyOpenRef = useRef(false);
  const isGalleryValidating = props.validating && !!props.validatingPreview;
  const showHistoryHint = useHistorySwipeHint(isUploadStep && !isGalleryValidating, historyOpen);
  const panelY = useMotionValue(UPLOAD_PANEL_HEIGHT);
  const nudgeY = useMotionValue(0);
  const panelCombinedY = useTransform([panelY, nudgeY], ([p, n]) => (p as number) + (n as number));
  const panelHeight = useMotionValue(UPLOAD_PANEL_HEIGHT);
  const openPanelHeight = UPLOAD_PANEL_HEIGHT + historyRevealHeight;

  useEffect(() => {
    if (!isUploadStep || historyOpen || !showHistoryHint) {
      nudgeY.set(0);
      return;
    }

    let cancelled = false;
    const runSyncedNudge = () => {
      if (cancelled) return;
      animate(nudgeY, HISTORY_HINT_NUDGE_OFFSET, {
        duration: 0.45,
        ease: "easeInOut",
      }).then(() => {
        if (cancelled) return;
        animate(nudgeY, 0, { duration: 0.45, ease: "easeInOut" });
      });
    };

    runSyncedNudge();
    const id = window.setInterval(runSyncedNudge, HISTORY_HINT_NUDGE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      nudgeY.set(0);
    };
  }, [isUploadStep, historyOpen, showHistoryHint, nudgeY]);

  useEffect(() => {
    const onResize = () => setHistoryRevealHeight(getHistoryRevealHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isUploadStep) {
      panelY.set(0);
      panelHeight.set(UPLOAD_PANEL_HEIGHT);
      historyOpenRef.current = false;
      setHistoryOpen(false);
      return;
    }
    panelY.set(UPLOAD_PANEL_HEIGHT);
    panelHeight.set(UPLOAD_PANEL_HEIGHT);
    const controls = animate(panelY, 0, {
      type: "spring",
      damping: 36,
      stiffness: 170,
      mass: 1.15,
    });
    return () => controls.stop();
  }, [isUploadStep, panelY, panelHeight]);

  const resetPanelPosition = () => {
    panelY.set(0);
    nudgeY.set(0);
  };

  const snapPanel = (open: boolean) => {
    historyOpenRef.current = open;
    setHistoryOpen(open);
    resetPanelPosition();
    animate(panelHeight, open ? openPanelHeight : UPLOAD_PANEL_HEIGHT, {
      type: "spring",
      stiffness: 420,
      damping: 36,
      mass: 0.9,
    });
  };

  const setPanelHeightFromDrag = (offsetY: number, opening: boolean) => {
    if (opening) {
      const lift = Math.max(0, -offsetY);
      panelHeight.set(UPLOAD_PANEL_HEIGHT + Math.min(historyRevealHeight, lift));
      return;
    }
    const closeDrag = Math.max(0, offsetY);
    panelHeight.set(Math.max(UPLOAD_PANEL_HEIGHT, openPanelHeight - closeDrag));
  };

  const onPanelPan = (_: unknown, info: PanInfo) => {
    if (historyOpenRef.current) {
      setPanelHeightFromDrag(info.offset.y, false);
      return;
    }
    setPanelHeightFromDrag(info.offset.y, true);
    if (info.offset.y < -historyRevealHeight * 0.22) {
      snapPanel(true);
    }
  };

  const onPanelPanEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.y;
    const velocityY = info.velocity.y;

    if (historyOpenRef.current) {
      if (velocityY > 180 || offset > historyRevealHeight * 0.1) {
        snapPanel(false);
      } else {
        snapPanel(true);
      }
      return;
    }

    if (velocityY < -220 || offset < -historyRevealHeight * 0.18) {
      snapPanel(true);
    } else {
      snapPanel(false);
    }
  };

  if (isPhotoPreview) {
    return (
      <div className="relative h-[100dvh] overflow-hidden bg-black">
        <img
          src={props.photo!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        {busy ? <AiStyleScanLine /> : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/75 via-black/35 to-transparent"
        />
        <AiStyleBackButton onClick={props.onGoHome ?? props.onReset} />
        <div
          className="absolute inset-x-0 bottom-0 z-10 space-y-3 px-5"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          {!busy ? (
            <button
              type="button"
              onClick={props.onReset}
              className="mx-auto block rounded-full border border-white/30 bg-black/25 px-4 py-2 text-[11px] font-bold text-white backdrop-blur-md active:opacity-80"
            >
              {t("aiStylePage.retake")}
            </button>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 px-5 py-4 text-sm font-bold text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
                {props.analyzing
                  ? t("aiStylePage.analyzing")
                  : tryOnBusy
                    ? t("aiStylePage.tryOnGenerating")
                    : t("aiStylePage.preparingPhoto")}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          isUploadStep && "min-h-0",
          showResults && "h-[14dvh]",
        )}
        style={
          isUploadStep
            ? { height: `calc(100dvh - ${UPLOAD_PANEL_HEIGHT}px)` }
            : undefined
        }
      >
        {isGalleryValidating ? (
          <GalleryValidatingHero previewUrl={props.validatingPreview!} />
        ) : showResults && props.photo ? (
          <ResultsHero photo={props.photo} />
        ) : (
          <HeroCarousel audience={props.audience} hintActive={showHistoryHint} />
        )}
        <AiStyleBackButton onClick={props.onGoHome} />
      </div>

      {isUploadStep ? (
        <>
          <motion.div
            style={{ y: panelCombinedY, bottom: UPLOAD_PANEL_HEIGHT }}
            className="pointer-events-none absolute inset-x-0 z-[15] flex justify-center pb-3"
          >
            <HistorySwipeHint visible={showHistoryHint} />
          </motion.div>

          <motion.div style={{ y: panelCombinedY }} className="absolute inset-x-0 bottom-0 z-10">
            <motion.div
              onPan={!historyOpen ? onPanelPan : undefined}
              onPanEnd={!historyOpen ? onPanelPanEnd : undefined}
              style={{ height: panelHeight }}
              className={cn(
                "flex flex-col overflow-hidden rounded-t-[28px] bg-white px-5 pb-8 pt-5 text-left text-foreground shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.28)]",
                !historyOpen && "cursor-grab touch-none active:cursor-grabbing",
              )}
            >
            <motion.div
              onPan={historyOpen ? onPanelPan : undefined}
              onPanEnd={historyOpen ? onPanelPanEnd : undefined}
              className={cn(
                "relative mb-2 flex w-full shrink-0 items-center",
                historyOpen ? "h-11 touch-none" : "justify-center py-2",
                historyOpen && "cursor-grab active:cursor-grabbing",
              )}
            >
              {historyOpen ? (
                <>
                  <div className="pointer-events-none absolute inset-x-0 flex justify-center">
                    <div aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/25" />
                  </div>
                  <div className="ml-auto">
                    <button
                      type="button"
                      onClick={() => snapPanel(false)}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label={t("common.close")}
                      className="relative z-10 grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-neutral-50 text-foreground active:opacity-80"
                    >
                      <X className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                </>
              ) : (
                <div aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/25" />
              )}
            </motion.div>

            <AnimatePresence initial={false} mode="wait">
              {historyOpen ? (
                <motion.div
                  key="history-panel-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="min-h-0 flex-1 overflow-y-auto"
                >
                  <UploadHistorySheet open={historyOpen} />
                </motion.div>
              ) : (
                <motion.div
                  key="upload-panel-content"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <StepRail step={props.step} />
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.5, ease: "easeOut" }}
                    className="mt-8 space-y-3"
                  >
                    <UploadActions
                      onOpenCamera={props.openCamera}
                      onOpenGallery={props.openFile}
                      validating={props.validating}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      ) : showResults ? (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", damping: 36, stiffness: 170, mass: 1.15 }}
          className="relative -mt-14 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 text-black"
        >
          <div className="min-h-0 flex-1 text-left">
            {props.onGoHome ? (
              <button
                type="button"
                onClick={props.onGoHome}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-neutral-50 px-3.5 py-2 text-[11px] font-bold text-foreground active:opacity-80"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
                {t("aiStylePage.home.backToHome")}
              </button>
            ) : null}
            <AiStyleResultsBlock
              result={props.result!}
              saved={props.saved}
              onToggleSave={props.onToggleSave}
              onReset={props.onReset}
              layout="carousel"
              variant="minimal"
              audience={props.audience}
              focusStyleId={props.focusStyleId}
              menPersonaId={props.menPersonaId}
              tryOnByStyle={props.tryOnByStyle}
              tryOnLoadingId={props.tryOnLoadingId}
              onGenerateTryOn={props.onGenerateTryOn}
            />
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
