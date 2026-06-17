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
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SignupStepReview({ name, phone, email, flow }: Props) {
  const meta = FLOW_IDENTITY_META[flow];
  const phoneDisplay = phone ? formatUzPhoneDisplay(phone) : "—";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Ma'lumotlarni tekshiring</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hammasi to'g'ri bo'lsa, onboarding bosqichiga o'ting.
        </p>
      </div>

      <div className="rounded-xl border border-info/30 bg-info/5 px-3 py-2.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Xavfsizlik va keyingi qadamlar</p>
        <ul className="mt-1.5 list-inside list-disc space-y-1">
          <li>Parol brauzer xotirasida saqlanmaydi — faqat joriy sessiyada.</li>
          <li>Email tasdiqlash profil sozlangach yuboriladi (5 xizmat + jadval).</li>
          {flow === "employee" && (
            <li>Salonga qo&apos;shilish uchun GPS va salon yaqinligi (100 m) talab qilinadi.</li>
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-muted/20 p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold">{meta.signupTitle}</span>
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              meta.accentClass,
            )}
          >
            {meta.badge}
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{meta.signupNextStep}</p>
        <ReviewRow label="Ism" value={name.trim()} />
        <ReviewRow label="Telefon" value={phoneDisplay} />
        <ReviewRow label="Email" value={email.trim()} />
      </div>
    </div>
  );
}
