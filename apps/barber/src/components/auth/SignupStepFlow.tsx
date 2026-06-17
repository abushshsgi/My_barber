import type { SignupFlow } from "@/lib/auth-ui";
import { FlowOptionCard } from "@/components/auth/FlowOptionCard";

const FLOWS: SignupFlow[] = ["owner", "employee", "mybarber", "independent"];

type Props = {
  flow: SignupFlow | null;
  onSelect: (flow: SignupFlow) => void;
};

export function SignupStepFlow({ flow, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Qaysi yo&apos;lni tanlaysiz?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir variantni tanlang — keyingi onboarding shunga qarab ochiladi.
        </p>
      </div>

      {/* Mobile: barcha variantlar bir ko'rinishda — swipe shart emas */}
      <div className="space-y-2.5 md:hidden">
        {FLOWS.map((f) => (
          <FlowOptionCard key={f} flow={f} selected={flow === f} onSelect={onSelect} layout="list" />
        ))}
      </div>

      {/* Desktop: 2x2 grid */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-3">
        {FLOWS.map((f) => (
          <FlowOptionCard key={f} flow={f} selected={flow === f} onSelect={onSelect} layout="grid" />
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
