import { Banknote, CreditCard, Home, MapPin, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export const WORK_LOCATION_OPTIONS = [
  { code: "studio", label: "Studiya / xona", icon: MapPin },
  { code: "home", label: "Uyda", icon: Home },
  { code: "mobile", label: "Mijozga boraman", icon: Truck },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { code: "cash", label: "Naqd" },
  { code: "card", label: "Bank kartasi" },
  { code: "payme", label: "Payme" },
  { code: "click", label: "Click" },
  { code: "uzum", label: "Uzum Bank" },
] as const;

type Props = {
  workLocation: string;
  onWorkLocationChange: (code: string) => void;
  paymentMethods: string[];
  onPaymentMethodsChange: (codes: string[]) => void;
  disabled?: boolean;
};

export function IndependentWorkPrefsEditor({
  workLocation,
  onWorkLocationChange,
  paymentMethods,
  onPaymentMethodsChange,
  disabled,
}: Props) {
  const togglePayment = (code: string) => {
    if (disabled) return;
    onPaymentMethodsChange(
      paymentMethods.includes(code)
        ? paymentMethods.filter((c) => c !== code)
        : [...paymentMethods, code],
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold">Qayerda ishlaysiz?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mijozlar bron qilishdan oldin ish joyingizni ko'radi.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {WORK_LOCATION_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = workLocation === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                disabled={disabled}
                onClick={() => onWorkLocationChange(opt.code)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left text-sm font-medium transition-colors",
                  active ? "border-foreground bg-muted/50" : "border-border hover:bg-muted/20",
                  disabled && "opacity-60",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">To'lov usullari</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Kamida bittasini tanlang — mijozlar qanday to'lashini biladi.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAYMENT_METHOD_OPTIONS.map((opt) => {
            const active = paymentMethods.includes(opt.code);
            return (
              <button
                key={opt.code}
                type="button"
                disabled={disabled}
                onClick={() => togglePayment(opt.code)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted/30",
                  disabled && "opacity-60",
                )}
              >
                {opt.code === "cash" ? (
                  <Banknote className="size-3.5" />
                ) : (
                  <CreditCard className="size-3.5" />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
