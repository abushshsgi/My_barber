import { Link } from "@tanstack/react-router";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Check, ChevronLeft } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AiStyleResultsBlock } from "@/components/ai-style/AiStyleResults";
import { AiStyleAnalyzeCta, AiStyleScanLine } from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { getTrendCoverUrl } from "@/lib/cover-images";
import { loadFaceProfile } from "@/lib/face-profile";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const HERO_SLIDES: Record<"men" | "women", readonly string[]> = {
  men: ["tr1", "tr3", "tr5", "tr1", "tr3"],
  women: ["tr2", "tr4", "tr6", "tr2", "tr4"],
};
const SLIDE_MS = 3800;
const UPLOAD_PANEL_HEIGHT = 305;
const UPLOAD_PANEL_COMPACT_HEIGHT = 72;
const UPLOAD_HISTORY_REVEAL_RATIO = 0.48;

function getHistoryRevealHeight() {
  if (typeof window === "undefined") return 400;
  return Math.round(window.innerHeight * UPLOAD_HISTORY_REVEAL_RATIO);
}

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

function UploadHistorySheet() {
  const { t, i18n } = useTranslation();
  const [profile] = useState(() => loadFaceProfile());

  const lastScan = profile
    ? new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(profile.scannedAt))
    : null;

  const entries = profile
    ? [
        {
          id: "latest",
          title: t(`aiStylePage.faceShapes.${profile.faceShapeKey}`),
          subtitle: profile.hairTypeKey
            ? t(`aiStylePage.hairTypes.${profile.hairTypeKey}`)
            : t("aiStylePage.steps.analyze"),
          date: lastScan ?? "",
        },
      ]
    : [];

  return (
    <div className="flex h-full flex-col px-5 pb-6 pt-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("aiStylePage.historyTitle")}
      </p>
      <p className="mt-1 text-base font-bold text-foreground">{t("aiStylePage.historySubtitle")}</p>

      {entries.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-border/60 bg-neutral-50 px-4 py-3"
            >
              <p className="text-sm font-semibold text-foreground">{entry.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{entry.subtitle}</p>
              {entry.date ? (
                <p className="mt-1 text-[10px] font-medium text-muted-foreground/80">{entry.date}</p>
              ) : null}
            </li>
          ))}
        </ul>
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
  const busy = props.analyzing || props.validating;
  const showResults = props.done && !!props.result;
  const isUploadStep = !props.photo && !showResults;
  const uploadDragControls = useDragControls();
  const [historyRevealHeight, setHistoryRevealHeight] = useState(getHistoryRevealHeight);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyOpenRef = useRef(false);
  const panelY = useMotionValue(0);
  const panelHeight = useMotionValue(UPLOAD_PANEL_HEIGHT);

  const historyOpacity = useTransform(panelY, (y) => {
    const progress = Math.min(1, Math.max(0, -y / historyRevealHeight));
    return progress;
  });
  const historySlideY = useTransform(panelY, (y) => {
    const progress = Math.min(1, Math.max(0, -y / historyRevealHeight));
    return (1 - progress) * historyRevealHeight * 0.35;
  });

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

  const snapPanel = (open: boolean) => {
    historyOpenRef.current = open;
    setHistoryOpen(open);
    animate(panelY, open ? -historyRevealHeight : 0, {
      type: "spring",
      stiffness: 420,
      damping: 36,
      mass: 0.9,
    });
    animate(panelHeight, open ? UPLOAD_PANEL_COMPACT_HEIGHT : UPLOAD_PANEL_HEIGHT, {
      type: "spring",
      stiffness: 420,
      damping: 36,
      mass: 0.9,
    });
  };

  const onPanelDrag = (_: unknown, info: PanInfo) => {
    if (historyOpenRef.current) return;
    if (info.offset.y < -historyRevealHeight * 0.22) {
      snapPanel(true);
    }
  };

  const onPanelDragEnd = (_: unknown, info: PanInfo) => {
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

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white">
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          isUploadStep && "min-h-0",
          props.photo && !showResults && "h-[44dvh]",
          showResults && "h-[24dvh]",
        )}
        style={
          isUploadStep
            ? { height: `calc(100dvh - ${UPLOAD_PANEL_HEIGHT}px)` }
            : undefined
        }
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

      {isUploadStep ? (
        <>
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] overflow-hidden bg-white"
            style={{
              height: historyRevealHeight,
              opacity: historyOpacity,
            }}
          >
            <motion.div className="h-full" style={{ y: historySlideY }}>
              <UploadHistorySheet />
            </motion.div>
          </motion.div>

          <motion.div
            drag="y"
            dragControls={uploadDragControls}
            dragListener={false}
            dragConstraints={{ top: -historyRevealHeight, bottom: 0 }}
            dragElastic={0.1}
            dragMomentum={false}
            onDrag={onPanelDrag}
            onDragEnd={onPanelDragEnd}
            style={{ y: panelY, height: panelHeight }}
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-[28px] bg-white px-5 pb-8 pt-5 text-left text-foreground shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.28)]"
          >
            <div
              aria-hidden
              onPointerDown={(event) => uploadDragControls.start(event)}
              className="-mt-2 mb-3 flex shrink-0 touch-none cursor-grab justify-center pb-0.5 pt-1 active:cursor-grabbing"
            >
              <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            <AnimatePresence initial={false}>
              {!historyOpen ? (
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
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </>
      ) : (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", damping: 36, stiffness: 170, mass: 1.15 }}
          className={cn(
            "relative -mt-16 flex shrink-0 flex-col rounded-t-[28px] bg-white px-5 pb-8 pt-5 text-left text-foreground shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.28)]",
            showResults && "min-h-0 overflow-y-auto pb-6",
          )}
        >
          <StepRail step={props.step} />

          {props.done && props.result ? (
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
      )}
    </div>
  );
}
