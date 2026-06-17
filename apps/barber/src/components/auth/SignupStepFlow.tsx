import type { SignupFlow } from "@/lib/auth-ui";
import { FlowOptionCard } from "@/components/auth/FlowOptionCard";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";

const FLOWS: SignupFlow[] = ["owner", "employee", "mybarber", "independent"];

type Props = {
  flow: SignupFlow | null;
  onSelect: (flow: SignupFlow) => void;
};

function FlowGuide() {
  return (
    <div className="rounded-2xl border border-border/80 bg-muted/25 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
      <p className="font-semibold text-foreground">Qaysi biri sizga mos?</p>
      <ul className="mt-2 space-y-1.5">
        <li>
          <span className="text-foreground">Salon egasi</span> — o&apos;z salonim bor →{" "}
          <strong className="font-semibold text-foreground">
            {FLOW_IDENTITY_META.owner.signupTitle}
          </strong>
        </li>
        <li>
          <span className="text-foreground">Ishchi barber</span> — boshqaning saloniga →{" "}
          <strong className="font-semibold text-foreground">
            {FLOW_IDENTITY_META.employee.signupTitle}
          </strong>
        </li>
        <li>
          <span className="text-foreground">Tez ochish</span> — MyBarber brendi →{" "}
          <strong className="font-semibold text-foreground">
            {FLOW_IDENTITY_META.mybarber.signupTitle}
          </strong>
        </li>
        <li>
          <span className="text-foreground">Salonsiz</span> — mustaqil ish →{" "}
          <strong className="font-semibold text-foreground">
            {FLOW_IDENTITY_META.independent.signupTitle}
          </strong>
        </li>
      </ul>
    </div>
  );
}

export function SignupStepFlow({ flow, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Qaysi yo&apos;lni tanlaysiz?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bir variantni tanlang — keyingi onboarding shunga qarab ochiladi.
        </p>
      </div>

      <FlowGuide />

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
