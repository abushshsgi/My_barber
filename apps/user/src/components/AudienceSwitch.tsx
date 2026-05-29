import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAudience, type AudienceFilter } from "@/hooks/use-audience";

const OPTS: { key: AudienceFilter; tKey: string; fallback: string }[] = [
  { key: "all", tKey: "audience.all", fallback: "Hammasi" },
  { key: "men", tKey: "audience.men", fallback: "Erkaklar" },
  { key: "women", tKey: "audience.women", fallback: "Ayollar" },
];

export function AudienceSwitch() {
  const { t } = useTranslation();
  const { audience, setAudience } = useAudience();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeIndex = Math.max(0, OPTS.findIndex((o) => o.key === audience));

  return (
    <div className="relative inline-flex w-full rounded-full bg-surface p-1">
      <motion.div
        className="absolute inset-y-1 rounded-full bg-foreground shadow-sm"
        initial={false}
        animate={{
          left: `calc(${(activeIndex / OPTS.length) * 100}% + 4px)`,
          width: `calc(${100 / OPTS.length}% - 8px)`,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      />
      {OPTS.map((o) => {
        const active = audience === o.key;
        return (
          <button
            key={o.key}
            onClick={() => setAudience(o.key)}
            className={cn(
              "relative z-10 flex-1 rounded-full py-2.5 text-[12px] font-bold tracking-wide transition-colors",
              active ? "text-background" : "text-foreground/70 active:text-foreground",
            )}
            aria-pressed={active}
          >
            <span suppressHydrationWarning>
              {mounted ? t(o.tKey) : o.fallback}
            </span>
          </button>
        );
      })}
    </div>
  );
}
