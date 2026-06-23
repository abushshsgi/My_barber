import { motion } from "framer-motion";

const LABELS = ["Yo'l", "Ma'lumot", "Tekshirish"] as const;

type Props = {
  step: number;
};

/** Ketma-ket onboarding progress — Uzum uslubida. */
export function AuthOnboardingProgress({ step }: Props) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        {LABELS.map((label, i) => (
          <span
            key={label}
            className={`text-[11px] font-semibold transition-colors ${
              i <= step ? "text-violet-700" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex h-1 overflow-hidden rounded-full bg-zinc-100">
        {LABELS.map((_, i) => (
          <div key={i} className="relative h-full flex-1">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-violet-600"
              initial={false}
              animate={{
                width: i < step ? "100%" : i === step ? "100%" : "0%",
                opacity: i <= step ? 1 : 0.25,
              }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
            {i < LABELS.length - 1 ? (
              <span className="absolute right-0 top-0 h-full w-px bg-white" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
