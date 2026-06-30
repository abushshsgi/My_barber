import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function AuthMapIllustration() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="auth-map-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <motion.rect
        x="16"
        y="16"
        width="288"
        height="188"
        rx="24"
        fill="url(#auth-map-bg)"
        stroke="currentColor"
        strokeOpacity="0.12"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
      />

      {[48, 96, 144, 192, 240].map((x, i) => (
        <motion.path
          key={`v-${x}`}
          d={`M ${x} 36 L ${x} 192`}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.06"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 + i * 0.05, ease: EASE }}
        />
      ))}
      {[52, 92, 132, 172].map((y, i) => (
        <motion.path
          key={`h-${y}`}
          d={`M 28 ${y} L 292 ${y}`}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.06"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.05, ease: EASE }}
        />
      ))}

      <motion.path
        d="M72 148 C 98 120, 118 108, 148 96 S 198 72, 236 58"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.35"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.85, delay: 0.35, ease: EASE }}
      />

      {[
        { cx: 72, cy: 148, delay: 0.55 },
        { cx: 148, cy: 96, delay: 0.72 },
        { cx: 236, cy: 58, delay: 0.9 },
      ].map(({ cx, cy, delay }) => (
        <g key={`${cx}-${cy}`}>
          <motion.circle
            cx={cx}
            cy={cy}
            r="18"
            fill="currentColor"
            fillOpacity="0.08"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.35, 1], opacity: [0, 0.7, 0.35] }}
            transition={{ duration: 0.7, delay, ease: EASE }}
          />
          <motion.circle
            cx={cx}
            cy={cy}
            r="7"
            fill="currentColor"
            initial={{ scale: 0, y: -16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 18, delay: delay + 0.05 }}
          />
          <motion.path
            d={`M${cx} ${cy - 7} C ${cx - 2} ${cy - 18}, ${cx + 2} ${cy - 18}, ${cx} ${cy - 7}`}
            fill="currentColor"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 16, delay: delay + 0.1 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        </g>
      ))}

      <motion.g
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 1.05, ease: EASE }}
      >
        <rect x="196" y="138" width="88" height="44" rx="14" fill="currentColor" fillOpacity="0.92" />
        <text x="240" y="166" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
          3 nearby
        </text>
      </motion.g>
    </svg>
  );
}

export function AuthBookIllustration() {
  const slots = [
    { x: 36, active: false },
    { x: 108, active: true },
    { x: 180, active: false },
    { x: 252, active: false },
  ];

  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden>
      <motion.rect
        x="48"
        y="24"
        width="224"
        height="172"
        rx="28"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        strokeOpacity="0.12"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      />

      <motion.rect
        x="72"
        y="48"
        width="176"
        height="28"
        rx="10"
        fill="currentColor"
        fillOpacity="0.08"
        initial={{ opacity: 0, scaleX: 0.6 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
        style={{ transformOrigin: "160px 62px" }}
      />

      {slots.map(({ x, active }, i) => (
        <g key={x}>
          <motion.rect
            x={x}
            y="92"
            width="56"
            height="72"
            rx="14"
            fill={active ? "currentColor" : "currentColor"}
            fillOpacity={active ? 0.92 : 0.07}
            stroke="currentColor"
            strokeOpacity={active ? 0 : 0.1}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.25 + i * 0.1, ease: EASE }}
          />
          <motion.path
            d={`M ${x + 14} 112 L ${x + 42} 112`}
            fill="none"
            stroke={active ? "white" : "currentColor"}
            strokeOpacity={active ? 0.55 : 0.2}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.45 + i * 0.1, ease: EASE }}
          />
          <motion.path
            d={`M ${x + 14} 128 L ${x + 34} 128`}
            fill="none"
            stroke={active ? "white" : "currentColor"}
            strokeOpacity={active ? 0.4 : 0.15}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.52 + i * 0.1, ease: EASE }}
          />
        </g>
      ))}

      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.85 }}
        style={{ transformOrigin: "136px 128px" }}
      >
        <circle cx="136" cy="128" r="22" fill="white" stroke="currentColor" strokeWidth="2" />
        <motion.path
          d="M126 128 L132 134 L148 118"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 1, ease: EASE }}
        />
      </motion.g>

      <motion.rect
        x="92"
        y="178"
        width="136"
        height="12"
        rx="6"
        fill="currentColor"
        fillOpacity="0.08"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      />
      <motion.rect
        x="92"
        y="178"
        width="136"
        height="12"
        rx="6"
        fill="currentColor"
        fillOpacity="0.35"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.55, delay: 0.95, ease: EASE }}
        style={{ transformOrigin: "92px 184px" }}
      />
    </svg>
  );
}

export function AuthAiIllustration() {
  const styles = [
    { x: 28, rotate: -8, delay: 0.55 },
    { x: 118, rotate: 0, delay: 0.72 },
    { x: 208, rotate: 8, delay: 0.9 },
  ];

  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden>
      <motion.ellipse
        cx="160"
        cy="78"
        rx="52"
        ry="62"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.15"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ transformOrigin: "160px 78px" }}
      />

      <motion.path
        d="M118 52 C 128 34, 152 28, 160 34 C 168 28, 192 34, 202 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.35"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
      />

      <motion.path
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        strokeLinecap="round"
        initial={{ opacity: 0, d: "M 48 78 L 120 78" }}
        animate={{
          opacity: [0, 0.85, 0.85, 0],
          d: [
            "M 48 78 L 120 78",
            "M 48 78 L 120 78",
            "M 120 78 L 200 78",
            "M 200 78 L 272 78",
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
      />

      {styles.map(({ x, rotate, delay }) => (
        <motion.g
          key={x}
          initial={{ opacity: 0, y: 24, rotate: rotate - 6 }}
          animate={{ opacity: 1, y: 0, rotate }}
          transition={{ type: "spring", stiffness: 320, damping: 20, delay }}
          style={{ transformOrigin: `${x + 36}px 168px` }}
        >
          <rect
            x={x}
            y="128"
            width="72"
            height="72"
            rx="18"
            fill="currentColor"
            fillOpacity="0.08"
            stroke="currentColor"
            strokeOpacity="0.14"
          />
          <path
            d={`M${x + 18} 168 Q ${x + 36} 148, ${x + 54} 168`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
          <circle cx={x + 36} cy="152" r="4" fill="currentColor" fillOpacity="0.35" />
        </motion.g>
      ))}

      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={i}
          cx={96 + i * 42}
          cy={36 + (i % 2) * 10}
          r="3"
          fill="currentColor"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: [0, -8, -16] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: 0.6 + i * 0.25, ease: "easeOut" }}
        />
      ))}

      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 1.1, ease: EASE }}
      >
        <rect x="112" y="12" width="96" height="28" rx="14" fill="currentColor" fillOpacity="0.92" />
        <text x="160" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
          AI match
        </text>
      </motion.g>
    </svg>
  );
}
