import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Briefcase, Sparkles, Store, UserPlus } from "lucide-react";
import { useAuthAccent } from "@/components/auth/AuthAccentContext";
import type { SignupFlow } from "@/lib/auth-ui";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { cn } from "@/lib/utils";

const FLOW_ICON: Record<SignupFlow, ReactNode> = {
  owner: <Store className="size-5" />,
  employee: <UserPlus className="size-5" />,
  mybarber: <Sparkles className="size-5" />,
  independent: <Briefcase className="size-5" />,
};

type Props = {
  flow: SignupFlow;
  selected: boolean;
  onSelect: (flow: SignupFlow) => void;
  className?: string;
};

export function FlowCard({ flow, selected, onSelect, className }: Props) {
  const meta = FLOW_IDENTITY_META[flow];
  const accent = useAuthAccent();
  const a = ACCENT_STYLES[accent];

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(flow)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all active:scale-[0.99]",
        selected
          ? cn(a.btn, "border-primary text-primary-foreground shadow-md")
          : "border-border bg-card hover:border-zinc-300 hover:shadow-sm",
        className,
      )}
    >
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary-foreground/15" : "bg-muted")}>
        {FLOW_ICON[flow]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] font-semibold">{meta.signupTitle}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              selected ? "bg-primary-foreground/15 text-primary-foreground" : meta.accentClass,
            )}
          >
            {meta.badge}
          </span>
        </div>
        <p className={cn("mt-1 text-sm leading-snug", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {meta.signupSubtitle}
        </p>
      </div>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary-foreground bg-primary-foreground text-primary" : "border-border",
        )}
      >
        {selected && <Check className="size-3.5 stroke-[3]" />}
      </span>
    </motion.button>
  );
}
