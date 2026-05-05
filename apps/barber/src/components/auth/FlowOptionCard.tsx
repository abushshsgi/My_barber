import type { ReactNode } from "react";
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
}: {
  flow: SignupFlow;
  selected: boolean;
  onSelect: (flow: SignupFlow) => void;
}) {
  const meta = FLOW_IDENTITY_META[flow];
  return (
    <button
      type="button"
      onClick={() => onSelect(flow)}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 rounded-md p-1.5",
            selected ? "bg-background/20 text-background" : "bg-muted text-foreground",
          )}
        >
          {FLOW_ICON[flow]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{meta.title}</p>
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
              "text-xs mt-1",
              selected ? "text-background/80" : "text-muted-foreground",
            )}
          >
            {meta.desc}
          </p>
        </div>
      </div>
    </button>
  );
}
