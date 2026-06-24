import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";
import { formatUzPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  phone: string;
  email: string;
  flow: SignupFlow;
};

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/30 py-3.5 last:border-0">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SignupStepReview({ name, phone, email, flow }: Props) {
  const meta = FLOW_IDENTITY_META[flow];
  const phoneDisplay = formatUzPhoneDisplay(phone);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border/35 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-border/35 bg-[#fafaf9] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{meta.signupTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{meta.signupSubtitle}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold", meta.accentClass)}>
            {meta.badge}
          </span>
        </div>

        <div className="px-4">
          <ReviewRow label="Ism" value={name.trim()} />
          <ReviewRow label="Telefon" value={phoneDisplay} />
          <ReviewRow label="Email" value={email.trim()} />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Parol xavfsizlik uchun ko&apos;rsatilmaydi. Davom etish orqali ma&apos;lumotlaringizni tasdiqlaysiz.
      </p>
    </div>
  );
}
