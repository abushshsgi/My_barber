import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sendPhoneCode, verifyPhoneCode } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { needsOnboarding } from "@/lib/recommendations";
import { redirectIfAuthenticated } from "@/lib/require-auth";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    await redirectIfAuthenticated();
  },
  head: () => ({ meta: [{ title: "Kirish — mysaloon.uz" }] }),
  component: Auth,
});

function Auth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [appDeliveryCode, setAppDeliveryCode] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"sms" | "app">("sms");

  const applyOtpCode = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCode(digits.split("").concat(["", "", "", ""]).slice(0, 4));
  };

  const sendCode = useMutation({
    mutationFn: () => sendPhoneCode(phone),
    onSuccess: (data) => {
      setStep("code");
      setAppDeliveryCode(null);
      const mode = data.delivery === "app" ? "app" : "sms";
      setDeliveryMode(mode);

      if (data.debug_code) {
        setAppDeliveryCode(data.debug_code);
        applyOtpCode(data.debug_code);
      }

      toast.success(data.detail);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verify = useMutation({
    mutationFn: () => verifyPhoneCode(phone, code.join("")),
    onSuccess: (data) => {
      if (!data?.access || !data?.refresh || !data?.user) {
        toast.error("Kirish javobi noto'g'ri. Qayta urinib ko'ring.");
        return;
      }
      setSession(data.access, data.refresh, data.user);
      toast.success(data.is_new_user ? "Ro'yxatdan o'tdingiz!" : "Xush kelibsiz!");
      void router
        .navigate({
          to: needsOnboarding(data.user) ? "/onboarding" : "/",
        })
        .then(() => queryClient.invalidateQueries())
        .catch(() => queryClient.invalidateQueries());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSendCode = () => {
    if (phone.length < 9) {
      toast.error("Telefon raqamini to'g'ri kiriting");
      return;
    }
    sendCode.mutate();
  };

  const handleVerify = () => {
    if (code.join("").length < 4) {
      toast.error("4 raqamli kodni kiriting");
      return;
    }
    verify.mutate();
  };

  const busy = sendCode.isPending || verify.isPending;

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
            ? "Telefon raqamingizni kiriting. SMS ulanganda kod telefoningizga keladi."
            : deliveryMode === "app"
              ? `+998 ${phone} uchun tasdiq kodi quyida. (SMS provayder keyin ulanadi.)`
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
                disabled={busy}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))
                }
                placeholder="90 123 45 67"
                className="flex-1 border-0 bg-transparent px-4 py-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
        ) : (
          <div className="mt-8">
            {appDeliveryCode ? (
              <div className="mb-6 rounded-2xl border-2 border-dashed border-foreground/30 bg-surface px-4 py-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Vaqtinchalik kod (SMS ulanmagan)
                </p>
                <p className="mt-2 font-mono text-3xl font-bold tracking-[0.35em]">
                  {appDeliveryCode}
                </p>
                <button
                  type="button"
                  className="mt-3 text-xs font-bold text-muted-foreground underline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(appDeliveryCode);
                    toast.success("Kod nusxalandi");
                  }}
                >
                  Nusxalash
                </button>
              </div>
            ) : null}
            <div className="flex justify-center gap-3">
              {code.map((c, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={c}
                  disabled={busy}
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
                  className="h-16 w-14 rounded-2xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-foreground focus:outline-none disabled:opacity-60"
                />
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep("phone");
                setCode(["", "", "", ""]);
                setAppDeliveryCode(null);
              }}
              className="mt-6 w-full text-center text-xs font-bold text-muted-foreground underline disabled:opacity-60"
            >
              Boshqa raqam kiritish
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={step === "phone" ? handleSendCode : handleVerify}
        className={cn(
          "w-full rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background active:scale-[0.99] disabled:opacity-60",
        )}
      >
        {busy ? "Kutilmoqda…" : step === "phone" ? "Kod yuborish" : "Tasdiqlash"}
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
