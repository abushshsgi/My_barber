import { motion, useReducedMotion } from "framer-motion";
import type { SignupFlow } from "@/lib/auth-ui";
import { FlowCard } from "@/components/auth/form/FlowCard";
import { staggerChild } from "@/lib/motion-presets";

const FLOWS: SignupFlow[] = ["owner", "employee", "mybarber", "independent"];

type Props = {
  flow: SignupFlow | null;
  onSelect: (flow: SignupFlow) => void;
};

export function SignupStepFlow({ flow, onSelect }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-2">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:hidden"
      >
        <h2 className="text-sm font-semibold tracking-tight sm:text-base">Qaysi yo&apos;lni tanlaysiz?</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">Bir variantni tanlang</p>
      </motion.div>

      <div className="space-y-2">
        {FLOWS.map((f, i) => (
          <motion.div key={f} {...staggerChild(i, !!reduceMotion)}>
            <FlowCard flow={f} selected={flow === f} onSelect={onSelect} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
