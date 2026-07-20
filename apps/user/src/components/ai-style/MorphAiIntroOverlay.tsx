import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ensureMorphAiIntroBlob,
  getMorphAiIntroVideoSrc,
  prefetchMorphAiIntroVideo,
} from "@/lib/morph-ai-intro";

type Props = {
  open: boolean;
  onComplete: () => void;
};

function forcePlay(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  const play = video.play();
  if (play && typeof play.catch === "function") {
    play.catch(() => {
      /* autoplay blocked — skip still works */
    });
  }
}

export function MorphAiIntroOverlay({ open, onComplete }: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(open);
  const [videoSrc, setVideoSrc] = useState(getMorphAiIntroVideoSrc);
  const finishingRef = useRef(false);
  const completedRef = useRef(false);

  const completeOnce = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    if (!open) return;
    finishingRef.current = false;
    completedRef.current = false;
    setVisible(true);
    prefetchMorphAiIntroVideo();
    setVideoSrc(getMorphAiIntroVideoSrc());

    void ensureMorphAiIntroBlob().then((src) => {
      setVideoSrc((current) => {
        if (current.startsWith("blob:")) return current;
        const video = videoRef.current;
        // Don't restart mid-playback when blob arrives late.
        if (video && !video.paused && video.currentTime > 0.2) return current;
        return src;
      });
    });
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const video = videoRef.current;
    if (!video) return;

    const kick = () => forcePlay(video);
    kick();

    video.addEventListener("loadeddata", kick);
    video.addEventListener("canplay", kick);
    video.addEventListener("canplaythrough", kick);
    const raf = window.requestAnimationFrame(kick);
    const t0 = window.setTimeout(kick, 0);
    const t1 = window.setTimeout(kick, 80);

    return () => {
      video.removeEventListener("loadeddata", kick);
      video.removeEventListener("canplay", kick);
      video.removeEventListener("canplaythrough", kick);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [visible, videoSrc]);

  const finish = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    videoRef.current?.pause();
    setVisible(false);
    window.setTimeout(() => {
      completeOnce();
    }, 320);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence onExitComplete={completeOnce}>
      {visible ? (
        <motion.div
          key="morph-ai-intro"
          className="fixed inset-0 z-[280] flex items-center justify-center bg-black text-white"
          role="dialog"
          aria-modal="true"
          aria-label={t("aiStylePage.introVideo.title")}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
        >
          {/* Exact 9:16 stage fitted in the viewport — text stays on the video */}
          <div
            className="relative overflow-hidden bg-black"
            style={{
              width: "min(100vw, calc(100dvh * 9 / 16))",
              height: "min(100dvh, calc(100vw * 16 / 9))",
            }}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
              autoPlay
              preload="auto"
              disablePictureInPicture
              controls={false}
              onLoadedData={(e) => forcePlay(e.currentTarget)}
              onCanPlay={(e) => forcePlay(e.currentTarget)}
              onEnded={finish}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-black/75 via-black/30 to-transparent px-5 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))]">
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

            <div className="absolute inset-x-0 bottom-0 z-[1] flex justify-center bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
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
