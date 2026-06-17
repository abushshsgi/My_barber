import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { SignupFlow } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";
import { Briefcase, Sparkles, Store, UserPlus } from "lucide-react";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";

const FLOW_ICON: Record<SignupFlow, ReactNode> = {
  owner: <Store className="size-4" />,
  employee: <UserPlus className="size-4" />,
  mybarber: <Sparkles className="size-4" />,
  independent: <Briefcase className="size-4" />,
};

export function FlowOptionCard({
  flow,
  selected,
  onSelect,
  compact,
}: {
  flow: SignupFlow;
  selected: boolean;
  onSelect: (flow: SignupFlow) => void;
  compact?: boolean;
}) {
  const meta = FLOW_IDENTITY_META[flow];
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(flow)}
      initial={false}
      animate={{
        scale: selected ? 1.02 : 1,
      }}
      whileTap={{ scale: selected ? 0.99 : 0.98 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "w-full cursor-pointer rounded-xl border p-3 text-left transition-[var(--transition-smooth)]",
        compact && "min-w-[86vw] shrink-0 snap-center sm:min-w-0",
        selected
          ? "border-foreground bg-foreground text-background shadow-[var(--shadow-pop)]"
          : "border-border bg-card shadow-[var(--shadow-soft)] hover:border-foreground/40 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        <motion.div
          className={cn(
            "mt-0.5 rounded-md p-1.5",
            selected ? "bg-background/20 text-background" : "bg-muted text-foreground",
          )}
          animate={selected ? { rotate: [0, -5, 0] } : { rotate: 0 }}
          transition={{ duration: 0.35 }}
        >
          {FLOW_ICON[flow]}
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{meta.title}</p>
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors duration-300",
                selected ? "border-background/40 text-background/90" : meta.accentClass,
              )}
            >
              {meta.badge}
            </span>
          </div>
          <p
            className={cn(
              "mt-0.5 text-xs font-medium",
              selected ? "text-background/90" : "text-foreground",
            )}
          >
            {meta.benefit}
          </p>
          <p
            className={cn(
              "mt-1 text-xs leading-snug",
              selected ? "text-background/75" : "text-muted-foreground",
            )}
          >
            {meta.desc}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
