import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Compass, ArrowUpRight, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  nearbyCount?: number;
  className?: string;
}

/**
 * "Xarita Orqali Qidirish" — premium interactive map preview widget.
 * Acts as a teaser CTA that routes the user to the full /map experience.
 * Uses layered gradients to mimic a luxury holographic mini-map.
 */
export function MapPreviewCard({ nearbyCount = 12, className }: Props) {
  const reduce = useReducedMotion();

  return (
    <Link
      to="/map"
      aria-label="Xarita orqali qidirish"
      className={cn(
        "group relative block overflow-hidden rounded-3xl bg-onyx text-ivory shadow-luxury",
        "ring-1 ring-foreground/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        className,
      )}
    >
      {/* Holographic grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(120% 80% at 30% 40%, black 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(120% 80% at 30% 40%, black 35%, transparent 75%)",
        }}
      />
      {/* Gold glow blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.45), rgba(212,175,55,0) 70%)",
        }}
      />
      {/* Cyan/indigo accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(80,120,255,0.35), rgba(80,120,255,0) 70%)",
        }}
      />

      <div className="relative flex h-[200px] w-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ivory/60">
              Premium discovery
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight">
              Xarita orqali qidirish
            </h3>
            <p className="mt-1 text-[12px] font-medium text-ivory/70">
              {nearbyCount}+ salon yaqin atrofda
            </p>
          </div>

          <motion.span
            whileHover={reduce ? undefined : { rotate: -6, scale: 1.05 }}
            whileTap={reduce ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 22 }}
            className="grid h-11 w-11 place-items-center rounded-full bg-gold text-onyx shadow-pill"
            aria-hidden
          >
            <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} />
          </motion.span>
        </div>

        {/* Holo "you are here" marker */}
        <div className="relative h-12">
          <div className="absolute left-6 top-1/2 -translate-y-1/2">
            <motion.span
              aria-hidden
              animate={reduce ? undefined : { scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 -m-3 rounded-full bg-gold/40"
            />
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gold text-onyx ring-4 ring-gold/20">
              <MapPin className="h-4 w-4 fill-onyx" strokeWidth={0} />
            </span>
          </div>

          {/* Floating mini-pins */}
          <span className="absolute right-24 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ivory/15 ring-1 ring-ivory/20 backdrop-blur">
            <Navigation className="h-3.5 w-3.5 text-ivory" strokeWidth={2.2} />
          </span>
          <span className="absolute right-6 bottom-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ivory/15 ring-1 ring-ivory/20 backdrop-blur">
            <Compass className="h-4 w-4 text-ivory" strokeWidth={2.2} />
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold tracking-wide text-ivory/80">
              Live · Toshkent
            </span>
          </div>
          <span className="rounded-full bg-ivory/10 px-3 py-1 text-[11px] font-bold tracking-wide text-ivory ring-1 ring-ivory/15">
            Xaritani ochish
          </span>
        </div>
      </div>
    </Link>
  );
}
