import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { SignupFlow } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";
import { Briefcase, Sparkles, Store, UserPlus } from "lucide-react";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";

const FLOW_ICON: Record<SignupFlow, ReactNode> = {
  owner: <Store className="size-5" />,
  employee: <UserPlus className="size-5" />,
  mybarber: <Sparkles className="size-5" />,
  independent: <Briefcase className="size-5" />,
};

export function FlowOptionCard({
  flow,
  selected,
  onSelect,
  layout = "grid",
}: {
  flow: SignupFlow;
  selected: boolean;
  onSelect: (flow: SignupFlow) => void;
  /** mobile: vertikal ro'yxat; grid: desktop 2x2 */
  layout?: "list" | "grid";
}) {
  const meta = FLOW_IDENTITY_META[flow];
  const isList = layout === "list";

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(flow)}
      initial={false}
      animate={{ scale: selected ? 1.01 : 1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "w-full cursor-pointer rounded-2xl border text-left transition-[var(--transition-smooth)]",
        isList ? "p-4" : "p-3",
        selected
          ? "border-foreground bg-foreground text-background shadow-[var(--shadow-pop)]"
          : "border-border bg-card shadow-[var(--shadow-soft)] active:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl p-2.5",
            isList ? "size-11" : "size-9",
            selected ? "bg-background/20 text-background" : "bg-muted text-foreground",
          )}
        >
          {FLOW_ICON[flow]}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className={cn("font-semibold", isList ? "text-[15px]" : "text-sm")}>
                  {isList ? meta.signupTitle : meta.title}
                </p>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    selected ? "border-background/40 text-background/90" : meta.accentClass,
                  )}
                >
                  {meta.badge}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 leading-snug",
                  isList ? "text-[13px]" : "text-xs font-medium",
                  selected ? "text-background/85" : "text-muted-foreground",
                )}
              >
                {isList ? meta.signupSubtitle : meta.benefit}
              </p>
            </div>

            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                selected
                  ? "border-background bg-background text-foreground"
                  : "border-border bg-background text-transparent",
              )}
              aria-hidden
            >
              {selected && <Check className="size-3.5 stroke-[3]" />}
            </span>
          </div>

          {isList && (
            <p
              className={cn(
                "mt-2 text-[11px] leading-relaxed",
                selected ? "text-background/70" : "text-muted-foreground/90",
              )}
            >
              Keyin: {meta.signupNextStep}
            </p>
          )}

          {!isList && (
            <p
              className={cn(
                "mt-1 text-xs leading-snug",
                selected ? "text-background/75" : "text-muted-foreground",
              )}
            >
              {meta.desc}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
