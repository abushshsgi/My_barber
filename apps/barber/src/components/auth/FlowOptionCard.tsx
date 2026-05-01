import type { ReactNode } from "react";
import type { SignupFlow } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";
import { Briefcase, Sparkles, Store, UserPlus } from "lucide-react";

const FLOW_META: Record<SignupFlow, { title: string; desc: string; icon: ReactNode }> = {
  owner: {
    title: "Salon owner",
    desc: "O'z saloningizni yaratib ish boshlang.",
    icon: <Store className="size-4" />,
  },
  employee: {
    title: "Salonga qo'shilish",
    desc: "Mavjud salon tarkibiga ishchi sifatida qo'shiling.",
    icon: <UserPlus className="size-4" />,
  },
  mybarber: {
    title: "MyBarber salon",
    desc: "Shaxsiy brendingiz bilan tezkor salon yarating.",
    icon: <Sparkles className="size-4" />,
  },
  independent: {
    title: "Mustaqil barber",
    desc: "Salonsiz, mustaqil xizmatlar bilan ishlang.",
    icon: <Briefcase className="size-4" />,
  },
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
  const meta = FLOW_META[flow];
  return (
    <button
      type="button"
      onClick={() => onSelect(flow)}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-colors",
        selected ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 rounded-md p-1.5",
            selected ? "bg-background/20 text-background" : "bg-muted text-foreground",
          )}
        >
          {meta.icon}
        </div>
        <div>
          <p className="text-sm font-semibold">{meta.title}</p>
          <p className={cn("text-xs mt-1", selected ? "text-background/80" : "text-muted-foreground")}>
            {meta.desc}
          </p>
        </div>
      </div>
    </button>
  );
}

