import { motion } from "framer-motion";
import type { AuthDesktopVariant } from "@/lib/auth-desktop-variant";

type VisualProps = { className?: string };

/** Animatsiyali glow orb. */
export function GlowOrb({
  color,
  size = 320,
  className,
  delay = 0,
}: {
  color: string;
  size?: number;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className ?? ""}`}
      style={{ width: size, height: size, background: color }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

/** Indigo grid chiziqlar — Linear uslub. */
export function IndigoGrid({ className }: VisualProps) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-[0.18] ${className ?? ""}`}
      aria-hidden
    >
      <defs>
        <pattern id="indigo-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#818cf8" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#indigo-grid)" />
      <motion.path
        d="M-100 400 Q300 200 700 380 T1500 300"
        fill="none"
        stroke="#6366f1"
        strokeWidth="1.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.circle
        cx="75%"
        cy="25%"
        r="120"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeDasharray="8 6"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "75% 25%" }}
      />
    </svg>
  );
}

/** Crimson floating shapes — Linear crimson. */
export function CrimsonVectors({ className }: VisualProps) {
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.polygon
          key={i}
          points="50,10 90,90 10,90"
          fill="none"
          stroke="#fb7185"
          strokeWidth="1"
          opacity={0.2 + i * 0.1}
          style={{ transform: `translate(${20 + i * 30}%, ${10 + i * 20}%) scale(${0.5 + i * 0.3})` }}
          animate={{ rotate: [0, 15, -10, 0] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <motion.path
        d="M0 600 C200 500 400 700 800 550 S1200 400 1600 500"
        fill="none"
        stroke="#f43f5e"
        strokeWidth="2"
        opacity="0.25"
        animate={{ d: ["M0 600 C200 500 400 700 800 550 S1200 400 1600 500", "M0 580 C220 480 420 680 820 530 S1220 420 1600 480", "M0 600 C200 500 400 700 800 550 S1200 400 1600 500"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Figma sunset mesh blobs. */
export function SunsetMesh({ className }: VisualProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      <GlowOrb color="rgba(251,146,60,0.45)" size={400} className="-left-20 top-10" />
      <GlowOrb color="rgba(244,63,94,0.4)" size={350} className="right-0 top-1/4" delay={1} />
      <GlowOrb color="rgba(250,204,21,0.35)" size={300} className="bottom-0 left-1/3" delay={2} />
      <svg className="absolute inset-0 h-full w-full opacity-30">
        <motion.ellipse
          cx="20%"
          cy="70%"
          rx="180"
          ry="100"
          fill="#fb923c"
          animate={{ rx: [180, 200, 180], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 7, repeat: Infinity }}
        />
        <motion.ellipse
          cx="80%"
          cy="30%"
          rx="150"
          ry="80"
          fill="#e11d48"
          animate={{ ry: [80, 100, 80] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}

/** Figma ocean waves. */
export function OceanMesh({ className }: VisualProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      <GlowOrb color="rgba(6,182,212,0.4)" size={380} className="-right-16 top-20" />
      <GlowOrb color="rgba(59,130,246,0.35)" size={420} className="-left-24 bottom-10" delay={1.5} />
      <svg className="absolute bottom-0 w-full opacity-40" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <motion.path
          fill="#06b6d4"
          fillOpacity="0.2"
          animate={{
            d: [
              "M0,80 C360,160 720,0 1080,80 C1260,120 1380,60 1440,80 L1440,200 L0,200 Z",
              "M0,100 C360,40 720,140 1080,60 C1260,20 1380,100 1440,70 L1440,200 L0,200 Z",
              "M0,80 C360,160 720,0 1080,80 C1260,120 1380,60 1440,80 L1440,200 L0,200 Z",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          fill="#3b82f6"
          fillOpacity="0.15"
          animate={{
            d: [
              "M0,120 C400,60 800,160 1440,100 L1440,200 L0,200 Z",
              "M0,90 C400,150 800,50 1440,110 L1440,200 L0,200 Z",
              "M0,120 C400,60 800,160 1440,100 L1440,200 L0,200 Z",
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

/** Figma nova — yulduz va doiralar. */
export function NovaMesh({ className }: VisualProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      <GlowOrb color="rgba(192,38,211,0.4)" size={360} className="left-1/4 top-1/4" />
      <GlowOrb color="rgba(34,197,94,0.3)" size={280} className="right-1/4 bottom-1/4" delay={2} />
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute size-1 rounded-full bg-white"
          style={{ left: `${(i * 13 + 5) % 100}%`, top: `${(i * 19 + 3) % 100}%` }}
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
      <svg className="absolute inset-0 h-full w-full opacity-25">
        <motion.circle
          cx="50%"
          cy="50%"
          r="200"
          fill="none"
          stroke="#d946ef"
          strokeWidth="1"
          strokeDasharray="12 8"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50% 50%" }}
        />
      </svg>
    </div>
  );
}

/** Supabase emerald wave curves. */
export function GroveVectors({ className }: VisualProps) {
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full opacity-20 ${className ?? ""}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M-100 ${300 + i * 60} C200 ${200 + i * 40} 500 ${400 + i * 30} 900 ${280 + i * 50} S1400 ${220 + i * 60} 1600 ${320 + i * 40}`}
          fill="none"
          stroke="#34d399"
          strokeWidth={1.5 - i * 0.3}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4 + i, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

/** Supabase abyss — hex grid. */
export function AbyssHexGrid({ className }: VisualProps) {
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full opacity-[0.12] ${className ?? ""}`} aria-hidden>
      <defs>
        <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
          <path
            d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
      <motion.polygon
        points="200,150 280,200 280,300 200,350 120,300 120,200"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="1.5"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </svg>
  );
}

/** Supabase pulse — dual glow rings. */
export function PulseRings({ className }: VisualProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden ${className ?? ""}`} aria-hidden>
      <GlowOrb color="rgba(52,211,153,0.25)" size={500} className="opacity-60" />
      <GlowOrb color="rgba(168,85,247,0.3)" size={400} delay={1} className="opacity-50" />
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-emerald-500/30"
          style={{ width: 200 + i * 120, height: 200 + i * 120 }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.15, 0.4] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}
    </div>
  );
}

export function VariantVisual({ variant }: { variant: AuthDesktopVariant }) {
  switch (variant) {
    case "linear-indigo":
      return <IndigoGrid />;
    case "linear-crimson":
      return <CrimsonVectors />;
    case "figma-sunset":
      return <SunsetMesh />;
    case "figma-ocean":
      return <OceanMesh />;
    case "figma-nova":
      return <NovaMesh />;
    case "supabase-grove":
      return <GroveVectors />;
    case "supabase-abyss":
      return <AbyssHexGrid />;
    case "supabase-pulse":
      return <PulseRings />;
    default:
      return null;
  }
}
