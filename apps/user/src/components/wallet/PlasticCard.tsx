import { useCallback, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Nfc } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WalletCardCreamCap, WalletEmvChip } from "@/components/wallet/WalletCardBrand";
import {
  type WalletCardVariant,
  walletCardThemes,
} from "@/components/wallet/wallet-variants";
import { loyaltyMock, userProfile, walletSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TILT_SPRING = { type: "spring" as const, stiffness: 320, damping: 24 };
const MAX_TILT_Y = 24;
const MAX_TILT_X = 18;

function plasticPan(balance: number) {
  const n = String(balance).padStart(12, "0").slice(-12);
  return `8600 ${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8, 12)}`;
}

type Props = {
  variant?: WalletCardVariant;
};

export function PlasticCard({ variant = "premium" }: Props) {
  const { t } = useTranslation();
  const theme = walletCardThemes[variant];
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const pressing = useRef(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const resetTilt = useCallback(() => {
    animate(rotateX, 0, TILT_SPRING);
    animate(rotateY, 0, TILT_SPRING);
  }, [rotateX, rotateY]);

  const applyTilt = useCallback(
    (clientX: number, clientY: number) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const dy = ((clientY - rect.top) / rect.height - 0.5) * 2;
      rotateY.set(dx * MAX_TILT_Y);
      rotateX.set(-dy * MAX_TILT_X);
    },
    [rotateX, rotateY],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reduced) return;
      pressing.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      applyTilt(e.clientX, e.clientY);
    },
    [reduced, applyTilt],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current || reduced) return;
      applyTilt(e.clientX, e.clientY);
    },
    [reduced, applyTilt],
  );

  const endTilt = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current) return;
      pressing.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      resetTilt();
    },
    [resetTilt],
  );

  const lightTop = theme.showCreamCap;

  return (
    <div className="w-full max-w-[340px]" style={{ perspective: 1100 }}>
      <motion.article
        key={variant}
        ref={cardRef}
        className={cn(
          "relative w-full touch-none select-none overflow-hidden",
          theme.aspectClass ?? "aspect-[1.586/1]",
          theme.rounded,
          lightTop ? "text-background" : theme.textOnDark,
          !reduced && "cursor-grab active:cursor-grabbing",
          variant === "glass" && "backdrop-blur-xl",
        )}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          touchAction: "none",
          transformOrigin: "50% 55%",
          background: theme.background,
          boxShadow: theme.boxShadow,
        }}
        initial={reduced ? false : { opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endTilt}
        onPointerCancel={endTilt}
      >
        {theme.showCreamCap && theme.creamCap ? (
          <WalletCardCreamCap />
        ) : null}

        {variant === "glass" ? (
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,oklch(1_0_0/0.18),transparent_45%)]"
            aria-hidden
          />
        ) : null}

        {theme.showMagStripe ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(180deg,oklch(0.22_0_0),oklch(0.12_0_0))]"
            aria-hidden
          />
        ) : null}

        <div
          className={cn(
            "relative z-20 flex flex-col justify-between px-5 pb-4 pt-4",
            lightTop ? "h-[54%] text-foreground" : "min-h-[58%]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.22em]",
                  lightTop ? "text-muted-foreground" : theme.textMuted,
                )}
              >
                mysaloon wallet
              </p>
              <p
                className={cn(
                  "inline-flex items-baseline gap-1 text-xs font-medium",
                  lightTop ? "text-muted-foreground/90" : theme.textMuted,
                )}
              >
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                <span>{t("walletPage.available")}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WalletEmvChip onDark={theme.chipOnDark} />
              <motion.div
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl shadow-lg backdrop-blur",
                  lightTop
                    ? "bg-foreground/95 text-background shadow-black/30"
                    : "bg-white/15 text-white shadow-black/20",
                )}
                animate={reduced ? undefined : { scale: [1, 1.04, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                aria-label={t("walletPage.nfc")}
              >
                <Nfc className="h-5 w-5" strokeWidth={2.2} />
              </motion.div>
            </div>
          </div>

          <div className="space-y-1">
            <p
              className={cn(
                "text-[38px] font-semibold leading-none tracking-tight tabular-nums md:text-[42px]",
                !lightTop && theme.textOnDark,
              )}
            >
              {walletSummary.balance.toLocaleString("uz-UZ")}
              <span
                className={cn(
                  "ml-1.5 text-lg font-semibold",
                  lightTop ? "text-muted-foreground" : theme.textMuted,
                )}
              >
                so'm
              </span>
            </p>
            <p className={cn("text-[11px] font-medium", lightTop ? "text-muted-foreground" : theme.textMuted)}>
              {t("walletPage.balanceCaption", { value: walletSummary.balance.toLocaleString("uz-UZ") })}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col justify-end px-5 pb-5 pt-2",
            lightTop ? "h-[48%]" : "pb-6 pt-4",
            theme.showMagStripe && "pb-7",
          )}
        >
          <p className={cn("font-mono text-[14px] font-semibold tracking-[0.24em] tabular-nums", theme.panColor)}>
            {plasticPan(walletSummary.balance)}
          </p>
          <div
            className={cn(
              "mt-3 flex items-center justify-between gap-2 border-t pt-3",
              lightTop ? "border-background/18" : "border-white/15",
            )}
          >
            <p
              className={cn(
                "min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide",
                lightTop ? "text-background/92" : theme.textOnDark,
              )}
            >
              {userProfile.name}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[8px] font-semibold uppercase shadow-sm",
                lightTop
                  ? "bg-background/95 text-foreground shadow-black/20"
                  : "bg-white/15 text-white",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {loyaltyMock.tier}
            </span>
            <p className={cn("shrink-0 font-mono text-[11px] font-semibold", lightTop ? "text-background/60" : theme.textMuted)}>
              12/28
            </p>
          </div>
          <div
            className={cn(
              "mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.3em]",
              lightTop ? "text-background/45" : theme.textMuted,
            )}
          >
            <span>mysaloon</span>
            <span className="flex items-center gap-[3px]">
              <span className="h-4 w-4 rounded-full bg-[oklch(0.78_0.16_65)] opacity-90" />
              <span className="-ml-1 h-4 w-4 rounded-full bg-[oklch(0.72_0.18_40)] opacity-90" />
            </span>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
