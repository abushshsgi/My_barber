import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MYSALOON_DOT, MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { isNativeApp } from "@/lib/native-app";
import { cn } from "@/lib/utils";

type Props = {
  onFinished?: () => void;
};

const SHOW_MS = 1800;

/**
 * Capacitor ochilish ekrani — M mark + wordmark animatsiyasi.
 * Brauzerda ko‘rinmaydi.
 */
export function NativeBootSplash({ onFinished }: Props) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(() => isNativeApp());
  const [leaving, setLeaving] = useState(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const doneRef = useRef(false);

  useEffect(() => {
    if (!visible) return;

    void import("@capacitor/splash-screen").then(({ SplashScreen }) => {
      void SplashScreen.hide().catch(() => undefined);
    });

    const leaveAt = window.setTimeout(() => setLeaving(true), Math.max(200, SHOW_MS - 320));
    const doneAt = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      setVisible(false);
      onFinishedRef.current?.();
    }, SHOW_MS);

    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(doneAt);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      className={cn(
        "native-boot-splash fixed inset-0 z-[9999] flex flex-col items-center justify-center",
        "bg-[#171512] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
      )}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0.08 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 50% 42%, rgba(255,92,92,0.12), transparent 70%)",
        }}
      />

      <motion.div
        className="relative flex flex-col items-center gap-6"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="relative"
          initial={reduceMotion ? false : { scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.02 }}
        >
          <img
            src="/splash-mark.png"
            alt=""
            width={112}
            height={112}
            className="size-[7rem] rounded-[28%] object-cover shadow-[0_20px_60px_-20px_rgba(0,0,0,0.65)]"
            draggable={false}
          />
          {!reduceMotion ? (
            <motion.span
              className="absolute rounded-full"
              style={{
                width: 14,
                height: 14,
                backgroundColor: MYSALOON_DOT,
                right: "18%",
                bottom: "20%",
                boxShadow: `0 0 16px ${MYSALOON_DOT}`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.25, 1], opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
            />
          ) : null}
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <MysaloonLogo size="xl" tone="onDark" className="tracking-[-0.03em]" />
        </motion.div>

        <motion.p
          className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          Salon &amp; style
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
