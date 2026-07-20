import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const INTRO_VIDEO_SRC = "/ai-style/morph-ai-intro.mp4";

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
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    const play = video.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        /* autoplay blocked — skip still works */
      });
    }
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
          className="fixed inset-0 z-[280] flex flex-col items-center justify-center overflow-hidden bg-black/80 text-white"
          role="dialog"
          aria-modal="true"
          aria-label={t("aiStylePage.introVideo.title")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 bg-black/60 backdrop-blur-2xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.07),_transparent_62%)]" />

          <div className="relative z-[1] flex w-full max-w-md flex-col items-center px-5">
            <motion.div
              className="w-full overflow-hidden rounded-[28px] border border-white/15 bg-black/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
              style={{ aspectRatio: "9 / 16", maxHeight: "min(68dvh, 560px)" }}
              initial={{ opacity: 0, scale: 0.88, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <video
                ref={videoRef}
                src={INTRO_VIDEO_SRC}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
                preload="auto"
                onEnded={finish}
              />
            </motion.div>

            <motion.div
              className="mt-6 max-w-[20rem] text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: 0.12, duration: 0.45 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                {t("aiStylePage.introVideo.badge")}
              </p>
              <h2 className="mt-2 font-display text-[1.65rem] font-extrabold leading-tight tracking-[-0.03em]">
                {t("aiStylePage.introVideo.title")}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/65">
                {t("aiStylePage.introVideo.desc")}
              </p>
            </motion.div>

            <motion.button
              type="button"
              onClick={finish}
              className="mt-5 min-h-11 rounded-full border border-white/20 bg-white/10 px-5 text-[13px] font-bold text-white/90 backdrop-blur-md active:scale-[0.98]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              {t("aiStylePage.introVideo.skip")}
            </motion.button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
