import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MORPH_AI_INTRO_VIDEO_SRC, prefetchMorphAiIntroVideo } from "@/lib/morph-ai-intro";

type Props = {
  open: boolean;
  onComplete: () => void;
};

export function MorphAiIntroOverlay({ open, onComplete }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(open);
  const finishingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    finishingRef.current = false;
    setVisible(true);
    prefetchMorphAiIntroVideo();
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.muted = true;
      const play = video.play();
      if (play && typeof play.catch === "function") {
        play.catch(() => {
          /* autoplay blocked — skip still works */
        });
      }
    };

    video.currentTime = 0;
    tryPlay();

    const onReady = () => tryPlay();
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    return () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
    };
  }, [visible]);

  const finish = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    videoRef.current?.pause();
    setVisible(false);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (finishingRef.current) onComplete();
      }}
    >
      {visible ? (
        <motion.div
          key="morph-ai-intro"
          className="fixed inset-0 z-[280] flex flex-col bg-black text-white"
          role="dialog"
          aria-modal="true"
          aria-label={t("aiStylePage.introVideo.title")}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <video
              ref={videoRef}
              src={MORPH_AI_INTRO_VIDEO_SRC}
              className="absolute inset-0 h-full w-full object-contain bg-black"
              playsInline
              muted
              autoPlay
              preload="auto"
              onEnded={finish}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-black/70 via-black/25 to-transparent px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                {t("aiStylePage.introVideo.badge")}
              </p>
              <h2 className="mt-2 max-w-[18rem] font-display text-[1.45rem] font-extrabold leading-tight tracking-[-0.03em]">
                {t("aiStylePage.introVideo.title")}
              </h2>
              <p className="mt-1.5 max-w-[20rem] text-[13px] leading-relaxed text-white/65">
                {t("aiStylePage.introVideo.desc")}
              </p>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-[1] flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
              <button
                type="button"
                onClick={finish}
                className="min-h-11 rounded-full border border-white/20 bg-white/10 px-5 text-[13px] font-bold text-white/90 backdrop-blur-md active:scale-[0.98]"
              >
                {t("aiStylePage.introVideo.skip")}
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
