import { useRef } from "react";
import type { SignupFlow } from "@/lib/auth-ui";
import { FlowOptionCard } from "@/components/auth/FlowOptionCard";

const FLOWS: SignupFlow[] = ["owner", "employee", "mybarber", "independent"];

type Props = {
  flow: SignupFlow | null;
  onSelect: (flow: SignupFlow) => void;
};

export function SignupStepFlow({ flow, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Qaysi yo'lni tanlaysiz?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keyingi onboarding bosqichi tanlovingizga bog'liq.
        </p>
      </div>

      {/* Mobile: horizontal snap scroll — full bleed */}
      <div className="-mx-3.5 sm:hidden">
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3.5 pb-2 scrollbar-none touch-pan-x"
        >
          {FLOWS.map((f) => (
            <FlowOptionCard
              key={f}
              flow={f}
              selected={flow === f}
              onSelect={onSelect}
              compact
            />
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          {FLOWS.map((f) => (
            <span
              key={f}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                flow === f ? "w-4 bg-foreground" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: 2x2 grid */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-3">
        {FLOWS.map((f) => (
          <FlowOptionCard key={f} flow={f} selected={flow === f} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
