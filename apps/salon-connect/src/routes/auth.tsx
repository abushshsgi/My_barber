import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Kirish — mysaloon.uz" }] }),
  component: Auth,
});

function Auth() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);

  const handleSendCode = () => {
    if (phone.length < 9) {
      toast.error("Telefon raqamini to'g'ri kiriting");
      return;
    }
    setStep("code");
    toast.success("Tasdiq kodi yuborildi");
  };

  const handleVerify = () => {
    if (code.join("").length < 4) {
      toast.error("4 raqamli kodni kiriting");
      return;
    }
    toast.success("Xush kelibsiz!");
    router.navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-6 py-10">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">mysaloon</span>
        <span className="text-base font-bold text-muted-foreground">.uz</span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {step === "phone" ? "Kirish" : "Tasdiqlash"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {step === "phone" ? "Xush kelibsiz" : "Kodni kiriting"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "phone"
            ? "Telefon raqamingizni kiriting, sizga SMS orqali tasdiq kodi yuboramiz."
            : `+998 ${phone} raqamiga yuborilgan 4 raqamli kodni kiriting.`}
        </p>

        {step === "phone" ? (
          <div className="mt-8">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Telefon raqami
            </label>
            <div className="mt-2 flex items-center overflow-hidden rounded-2xl border-2 border-border bg-background focus-within:border-foreground">
              <span className="border-r border-border px-4 py-4 text-sm font-bold">
                +998
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                placeholder="90 123 45 67"
                className="flex-1 border-0 bg-transparent px-4 py-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex justify-center gap-3">
              {code.map((c, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={c}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 1);
                    const next = [...code];
                    next[i] = v;
                    setCode(next);
                    if (v && i < 3) {
                      const el = document.getElementById(`otp-${i + 1}`);
                      el?.focus();
                    }
                  }}
                  id={`otp-${i}`}
                  className="h-16 w-14 rounded-2xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-foreground focus:outline-none"
                />
              ))}
            </div>
            <button
              onClick={() => setStep("phone")}
              className="mt-6 w-full text-center text-xs font-bold text-muted-foreground underline"
            >
              Boshqa raqam kiritish
            </button>
          </div>
        )}
      </div>

      <button
        onClick={step === "phone" ? handleSendCode : handleVerify}
        className={cn(
          "w-full rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background active:scale-[0.99]",
        )}
      >
        {step === "phone" ? "Kod yuborish" : "Tasdiqlash"}
      </button>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Davom etish orqali siz{" "}
        <a href="/privacy" className="font-bold underline">
          maxfiylik siyosati
        </a>{" "}
        bilan rozisiz.
      </p>
    </div>
  );
}
