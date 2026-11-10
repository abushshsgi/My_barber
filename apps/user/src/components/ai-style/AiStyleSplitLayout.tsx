import { Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  type PanInfo,
} from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Clock, Loader2, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaceAnalysisSummarySheet } from "@/components/ai-style/FaceAnalysisSummarySheet";
import { AiStyleResultsPage } from "@/components/ai-style/AiStyleResultsPage";
import { GalleryValidatingHero } from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { refreshAiStyleHistoryCache } from "@/lib/api";
import {
  FACE_HISTORY_UPDATED_EVENT,
  getActiveUserId,
  type FaceProfileHistoryEntry,
} from "@/lib/face-profile";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { TryOnHeroImage } from "@/components/ai-style/TryOnHeroImage";
const UPLOAD_PANEL_HEIGHT = 236;
const UPLOAD_HISTORY_REVEAL_RATIO = 0.48;

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
  summaryReady?: boolean;
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
  onAcceptSummary?: () => void;
  tryOnByStyle: Record<string, string>;
  tryOnLoadingId: string | null;
  onGenerateTryOn: (styleId: string, personaId?: ExplorePersonaId, title?: string) => void;
  onUpdateTryOnPreview?: (cacheKey: string, previewImage: string) => void;
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
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[11px] font-bold transition-all",
                  reached ? "bg-foreground text-background" : "bg-foreground/[0.08] text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : n}
              </div>
              <p
                className={cn(
                  "max-w-[72px] text-center text-[11px] leading-tight",
                  current ? "font-bold text-foreground" : "font-semibold text-muted-foreground",
                )}
              >
                {label}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mt-3 h-px min-w-6 flex-1",
                  step > n ? "bg-foreground" : "bg-foreground/10",
                )}
              />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

/** Ilova try-on sahifasidagi qiz rasmi va yuqori matn. Pastki yozuv va slayd yo'q. */
function TryOnHero() {
  const { t } = useTranslation();

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f6f3f0]">
      <TryOnHeroImage className="absolute inset-0 h-full w-full object-cover object-top [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-top" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_28%,rgba(255,255,255,0.55)_58%,#ffffff_78%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] px-6 pt-[max(2.75rem,calc(env(safe-area-inset-top)+2.25rem))] text-center text-white">
        <p className="text-[26px] font-extrabold tracking-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
          {t("aiStylePage.uploadTitle")}
        </p>
        <p className="mx-auto mt-1 max-w-[280px] text-[13px] font-medium text-white/90 drop-shadow-[0_1px_5px_rgba(0,0,0,0.35)]">
          {t("aiStylePage.uploadHint")}
        </p>
      </div>
    </div>
  );
}

function FaceScanMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden>
      <path d="M4.5 9.2V6.8A2.3 2.3 0 0 1 6.8 4.5H9.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.8 4.5h2.4A2.3 2.3 0 0 1 23.5 6.8V9.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.5 18.8v2.4A2.3 2.3 0 0 0 6.8 23.5H9.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M23.5 18.8v2.4a2.3 2.3 0 0 1-2.3 2.3H18.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="11" cy="12.2" r="1.35" fill="currentColor" />
      <circle cx="17" cy="12.2" r="1.35" fill="currentColor" />
      <path d="M10.4 16.1c.9 1.7 2.1 2.5 3.6 2.5s2.7-.8 3.6-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GalleryStackMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <rect x="4.2" y="7.2" width="13" height="15.5" rx="3" fill="#D4D4D4" transform="rotate(-16 10.7 15)" />
      <rect x="11" y="6.2" width="13" height="15.5" rx="3" fill="#B0B0B0" transform="rotate(12 17.5 14)" />
      <rect x="7.5" y="6" width="13" height="16" rx="3.2" fill="currentColor" />
    </svg>
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
    <div className="flex gap-2.5 px-1">
      <button
        type="button"
        disabled={validating}
        onClick={onOpenCamera}
        onPointerDown={(event) => event.stopPropagation()}
        className="inline-flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] bg-foreground px-2 py-2 text-[12px] font-bold leading-tight text-white active:scale-[0.98] disabled:opacity-60"
      >
        <FaceScanMark className="h-7 w-7" />
        {t("aiStylePage.openCamera")}
      </button>
      <button
        type="button"
        disabled={validating}
        onClick={onOpenGallery}
        onPointerDown={(event) => event.stopPropagation()}
        className="inline-flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] border-[1.5px] border-dashed border-foreground/25 bg-transparent px-2 py-2 text-[12px] font-bold leading-tight text-foreground active:scale-[0.98] disabled:opacity-60"
      >
        <GalleryStackMark className="h-7 w-7 text-foreground" />
        {t("aiStylePage.pickFromGallery")}
      </button>
    </div>
  );
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
          <p className="mt-1 text-base font-bold text-foreground">
            {t("aiStylePage.historySubtitle")}
          </p>
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
  const showSummary = Boolean(props.summaryReady && props.result && props.photo && !showResults);
  const isPhotoPreview = !!props.photo && !showResults;
  const isUploadStep = !props.photo && !showResults;
  const [historyRevealHeight, setHistoryRevealHeight] = useState(getHistoryRevealHeight);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyOpenRef = useRef(false);
  const isGalleryValidating = props.validating && !!props.validatingPreview;
  const panelHeight = useMotionValue(UPLOAD_PANEL_HEIGHT);
  const openPanelHeight = UPLOAD_PANEL_HEIGHT + historyRevealHeight;

  useEffect(() => {
    const onResize = () => setHistoryRevealHeight(getHistoryRevealHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isUploadStep) {
      panelHeight.set(UPLOAD_PANEL_HEIGHT);
      historyOpenRef.current = false;
      setHistoryOpen(false);
    }
  }, [isUploadStep, panelHeight]);

  const snapPanel = (open: boolean) => {
    historyOpenRef.current = open;
    setHistoryOpen(open);
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

  if (showResults && props.result) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <AiStyleResultsPage
          result={props.result}
          photo={props.photo}
          tryOnByStyle={props.tryOnByStyle}
          tryOnLoadingId={props.tryOnLoadingId}
          menPersonaId={props.menPersonaId}
          audience={props.audience}
          onBack={props.onGoHome ?? props.onReset}
          onGenerateTryOn={props.onGenerateTryOn}
        />
      </div>
    );
  }

  if (showSummary && props.result && props.photo) {
    return (
      <div className="relative h-full min-h-0 flex-1 overflow-hidden bg-black">
        <img
          src={props.photo}
          alt=""
          className="absolute inset-0 h-full w-full origin-center bg-black object-cover object-[center_28%] max-lg:scale-[1.06] lg:object-contain lg:object-center"
        />
        <button
          type="button"
          onClick={props.onGoHome ?? props.onReset}
          className="absolute left-3 z-20 grid size-8 place-items-center rounded-full bg-white/94"
          style={{ top: "max(10px, env(safe-area-inset-top))" }}
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-[18px] w-[18px] text-[#0A0A0A]" strokeWidth={2.4} />
        </button>
        <div className="absolute inset-x-0 bottom-0 z-10">
          <FaceAnalysisSummarySheet result={props.result} onStartGenerate={() => props.onAcceptSummary?.()} />
        </div>
      </div>
    );
  }

  if (isPhotoPreview) {
    return (
      <div className="relative h-full min-h-0 flex-1 overflow-hidden bg-black">
        <img
          src={props.photo!}
          alt=""
          className="absolute inset-0 h-full w-full origin-center bg-black object-cover object-[center_28%] max-lg:scale-[1.06] lg:object-contain lg:object-center"
        />
        <div aria-hidden className="absolute inset-0 bg-black/22" />
        {!busy ? (
          <button
            type="button"
            onClick={props.onGoHome ?? props.onReset}
            className="absolute left-3 z-20 grid size-8 place-items-center rounded-full bg-white/94"
            style={{ top: "max(10px, env(safe-area-inset-top))" }}
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-[18px] w-[18px] text-[#0A0A0A]" strokeWidth={2.4} />
          </button>
        ) : null}
        <div
          className="absolute inset-x-0 z-10 px-4"
          style={{ bottom: "max(3.5rem, calc(env(safe-area-inset-bottom) + 2.5rem))" }}
        >
          {busy ? (
            <div className="flex min-h-[54px] items-center justify-center gap-2.5 rounded-[18px] bg-[rgba(30,30,30,0.92)] px-5 text-sm font-bold text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              {props.analyzing
                ? t("aiStylePage.analyzing")
                : tryOnBusy
                  ? t("aiStylePage.tryOnGenerating")
                  : t("aiStylePage.preparingPhoto")}
            </div>
          ) : (
            <button
              type="button"
              onClick={props.onReset}
              className="flex min-h-[54px] w-full items-center justify-center rounded-[18px] bg-[rgba(30,30,30,0.92)] text-sm font-bold text-white"
            >
              {t("aiStylePage.retake")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        className={cn("relative shrink-0 overflow-hidden", isUploadStep && "absolute inset-0")}
      >
        {isGalleryValidating ? (
          <GalleryValidatingHero previewUrl={props.validatingPreview!} />
        ) : (
          <TryOnHero />
        )}
      </div>

      {isUploadStep ? (
        <>
          <motion.div className="absolute inset-x-0 bottom-0 z-10">
            <motion.div
              onPan={!historyOpen ? onPanelPan : undefined}
              onPanEnd={!historyOpen ? onPanelPanEnd : undefined}
              style={{ height: panelHeight }}
              className={cn(
                "flex flex-col overflow-hidden rounded-t-[28px] bg-white px-4 pb-3 pt-2 text-left text-foreground",
                !historyOpen && "cursor-grab touch-none active:cursor-grabbing",
              )}
            >
              <motion.div
                onPan={historyOpen ? onPanelPan : undefined}
                onPanEnd={historyOpen ? onPanelPanEnd : undefined}
                className={cn(
                  "relative mb-2 flex w-full shrink-0 items-center",
                  historyOpen ? "h-11 touch-none" : "h-9 justify-center",
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
                  <>
                    <div aria-hidden className="h-1 w-10 rounded-full bg-foreground/20" />
                    <button
                      type="button"
                      onClick={() => snapPanel(true)}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label={t("aiStylePage.historyButton")}
                      className="absolute right-0 grid size-[34px] place-items-center rounded-full bg-foreground/[0.06] text-foreground active:opacity-80"
                    >
                      <Clock className="size-4" strokeWidth={1.75} />
                    </button>
                  </>
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
                      className="mt-2"
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
      ) : null}
    </div>
  );
}
