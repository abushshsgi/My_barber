import { Keyboard, ScanLine, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "barber_checkin_onboarding_v1";

const STEPS = [
  {
    icon: Keyboard,
    title: "Qo'lda kod",
    body: "Mijoz 6 xonali kodni aytsa, shu yerga yozing va Qabul bosing.",
  },
  {
    icon: ScanLine,
    title: "Kamera QR",
    body: "Telefon kamerasi bilan mijoz ilovasidagi QR kodni skaner qiling.",
  },
  {
    icon: Smartphone,
    title: "Tashqi skaner",
    body: "Barcode/QR skaner apparati ulangan bo'lsa, maydonga fokus qilib skaner qiling — avtomatik qabul qilinadi.",
  },
] as const;

export function CheckInOnboarding({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  return (
    <div className={cn("rounded-xl bg-muted/50 p-3.5", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-foreground shadow-sm">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Qabul qilish · {step + 1}/{STEPS.length}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{current.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{current.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
              >
                Keyingi
              </button>
            ) : (
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
              >
                Tushundim
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              O'tkazib yuborish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
