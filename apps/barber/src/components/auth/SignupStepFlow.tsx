import { motion, useReducedMotion } from "framer-motion";
import type { SignupFlow } from "@/lib/auth-ui";
import { FlowOptionCard } from "@/components/auth/FlowOptionCard";
import { staggerChild } from "@/lib/motion-presets";

const FLOWS: SignupFlow[] = ["owner", "employee", "mybarber", "independent"];

type Props = {
  flow: SignupFlow | null;
  onSelect: (flow: SignupFlow) => void;
};

export function SignupStepFlow({ flow, onSelect }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="md:hidden"
      >
        <h2 className="text-lg font-semibold tracking-tight">Qaysi yo&apos;lni tanlaysiz?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir variantni tanlang — keyingi onboarding shunga qarab ochiladi.
        </p>
      </motion.div>

      <div className="space-y-2.5 md:hidden">
        {FLOWS.map((f, i) => (
          <motion.div key={f} {...staggerChild(i, !!reduceMotion)}>
            <FlowOptionCard flow={f} selected={flow === f} onSelect={onSelect} layout="list" />
          </motion.div>
        ))}
      </div>

      <div className="hidden md:grid md:grid-cols-2 md:gap-3">
        {FLOWS.map((f, i) => (
          <motion.div key={f} {...staggerChild(i, !!reduceMotion)}>
            <FlowOptionCard flow={f} selected={flow === f} onSelect={onSelect} layout="grid" />
          </motion.div>
        ))}
      </div>

      {!flow && (
        <p className="text-center text-xs text-muted-foreground md:hidden">
          Tanlash uchun kartani bosing, keyin «Keyingisi»
        </p>
      )}
    </div>
  );
}
