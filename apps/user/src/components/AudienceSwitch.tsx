import { useEffect, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudience, type AudienceFilter } from "@/hooks/use-audience";

/**
 * Avatar cards audience switch:
 *  - 2 ta katta gradient card (Erkaklar / Ayollar) — SVG avatar bilan
 *  - kichik "Hammasi" pill ostda
 */

const MAN_GRADIENT =
  "linear-gradient(135deg, oklch(0.42 0.06 245), oklch(0.22 0.04 250))";
const WOMAN_GRADIENT =
  "linear-gradient(135deg, oklch(0.78 0.12 18), oklch(0.55 0.18 350))";

function ManAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none">
      <circle cx="32" cy="22" r="10" fill="rgba(255,255,255,0.95)" />
      <path
        d="M14 56c0-10 8-16 18-16s18 6 18 16"
        fill="rgba(255,255,255,0.95)"
      />
      <path
        d="M22 18c0-6 4-10 10-10s10 4 10 10v2c-3-2-7-3-10-3s-7 1-10 3v-2z"
        fill="rgba(0,0,0,0.45)"
      />
    </svg>
  );
}

function WomanAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none">
      <circle cx="32" cy="24" r="10" fill="rgba(255,255,255,0.95)" />
      <path
        d="M14 56c0-10 8-16 18-16s18 6 18 16"
        fill="rgba(255,255,255,0.95)"
      />
      <path
        d="M18 22c0-8 6-14 14-14s14 6 14 14c0 4-2 6-2 6s-2-4-12-4-12 4-12 4-2-2-2-6z"
        fill="rgba(0,0,0,0.45)"
      />
      <circle cx="22" cy="34" r="2.5" fill="rgba(0,0,0,0.35)" />
      <circle cx="42" cy="34" r="2.5" fill="rgba(0,0,0,0.35)" />
    </svg>
  );
}

const CARDS: {
  key: AudienceFilter;
  tKey: string;
  fallback: string;
  bg: string;
  Avatar: () => ReactElement;
}[] = [
  { key: "men", tKey: "audience.men", fallback: "Erkaklar", bg: MAN_GRADIENT, Avatar: ManAvatar },
  { key: "women", tKey: "audience.women", fallback: "Ayollar", bg: WOMAN_GRADIENT, Avatar: WomanAvatar },
];

export function AudienceSwitch() {
  const { t } = useTranslation();
  const { audience, setAudience } = useAudience();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {CARDS.map((c) => {
          const active = audience === c.key;
          const Avatar = c.Avatar;
          return (
            <motion.button
              key={c.key}
              onClick={() => setAudience(active ? "all" : c.key)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative flex h-[88px] items-center gap-3 overflow-hidden rounded-2xl px-3 text-left transition-shadow",
                active ? "shadow-lg ring-2 ring-foreground" : "shadow-sm",
              )}
              style={{ background: c.bg }}
              aria-pressed={active}
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Avatar />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  Kim uchun
                </p>
                <p className="text-base font-bold leading-tight text-white" suppressHydrationWarning>
                  {mounted ? t(c.tKey) : c.fallback}
                </p>
              </div>
              {active && (
                <motion.div
                  layoutId="audience-check"
                  className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-black"
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      <button
        onClick={() => setAudience("all")}
        className={cn(
          "self-center rounded-full border px-4 py-1.5 text-[11px] font-bold tracking-wide transition-colors",
          audience === "all"
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-background text-foreground/70 hover:text-foreground",
        )}
      >
        <span suppressHydrationWarning>
          {mounted ? t("audience.all") : "Hammasi"}
        </span>
      </button>
    </div>
  );
}
