import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { OtpResendTimer } from "@/components/auth/OtpResendTimer";
import { AuthMarketingPanel } from "@/components/auth/AuthMarketingPanel";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthMethodDivider, PhoneSignInComingSoon } from "@/components/auth/PhoneSignInComingSoon";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AuthRateLimitError,
  checkPhone,
  loginWithPassword,
  OTP_RESEND_COOLDOWN_SECONDS,
  SendCodeError,
  sendPhoneCode,
  setPassword,
  verifyPhoneCode,
} from "@/lib/api";
import { getLastPhone, setSession } from "@/lib/auth";
import { trackAuthSuccess } from "@/lib/ga";
import { clearQueryClientCache } from "@/lib/query-client";
import { getStoredOtpCooldownSeconds, storeOtpCooldown } from "@/lib/otp-cooldown";
import { formatUzLocalPhone, parseUzLocalPhone } from "@/lib/phone";
import { needsOnboarding } from "@/lib/recommendations";
import { redirectIfAuthenticated } from "@/lib/require-auth";
import type { PhoneAuthIntent, PhoneVerifyResponse } from "@/lib/api/types";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    await redirectIfAuthenticated();
  },
  head: () => ({ meta: [{ title: "Kirish — mysaloon.uz" }] }),
  component: Auth,
});

type Step = "phone" | "password" | "code" | "set-password";

const phoneAuthEnabled =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_PHONE_AUTH_ENABLED === "true";
const googleClientId = (
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_CLIENT_ID || ""
).trim();

function Auth() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(() => getLastPhone());
  const [password, setPasswordInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [code, setCode] = useState(["", "", "", ""]);
  const [appDeliveryCode, setAppDeliveryCode] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"sms" | "app">("sms");
  const [pendingAuth, setPendingAuth] = useState<PhoneVerifyResponse | null>(null);
  const [authIntent, setAuthIntent] = useState<PhoneAuthIntent>("register");
  const [resendSeconds, setResendSeconds] = useState(() => getStoredOtpCooldownSeconds(phone));
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    const stored = getStoredOtpCooldownSeconds(phone);
    if (stored > 0) setResendSeconds(stored);
  }, [phone]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const startResendCooldown = (seconds: number) => {
    const next = Math.max(1, Math.ceil(seconds));
    setResendSeconds(next);
    storeOtpCooldown(phone, next);
  };

  const requestOtpCode = () => {
    if (resendSeconds > 0) {
      toast.error(t("auth.resendWait", { seconds: resendSeconds }));
      return;
    }
    goToOtp.mutate();
  };

  const applyOtpCode = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCode(digits.split("").concat(["", "", "", ""]).slice(0, 4));
  };

  const finishLogin = (
    data: PhoneVerifyResponse,
    method: "google" | "phone" | "password" = "phone",
  ) => {
    trackAuthSuccess({ isNewUser: Boolean(data.is_new_user), method });
    setSession(data.access, data.refresh, data.user, data.session_id);
    clearQueryClientCache();
    toast.success(data.is_new_user ? t("auth.welcomeNew") : t("auth.welcomeBack"));
    void router
      .navigate({
        to: needsOnboarding(data.user) ? "/onboarding" : "/",
      })
      .then(() => queryClient.invalidateQueries())
      .catch(() => queryClient.invalidateQueries());
  };

  const goToOtp = useMutation({
    mutationFn: () => sendPhoneCode(phone, authIntent),
    onSuccess: (data) => {
      setStep("code");
      setAppDeliveryCode(null);
      setDeliveryMode(data.delivery === "app" ? "app" : "sms");
      startResendCooldown(data.resend_after ?? OTP_RESEND_COOLDOWN_SECONDS);
      if (data.debug_code) {
        setAppDeliveryCode(data.debug_code);
        applyOtpCode(data.debug_code);
      }
      toast.success(data.detail);
    },
    onError: (e: Error) => {
      if (e instanceof SendCodeError) {
        startResendCooldown(e.retryAfter);
        toast.error(t("auth.resendWait", { seconds: e.retryAfter }));
        return;
      }
      toast.error(e.message);
    },
  });

  const continuePhone = useMutation({
    mutationFn: () => checkPhone(phone),
    onSuccess: (data) => {
      setAuthIntent(data.registered ? "login" : "register");
      if (data.has_password) {
        setStep("password");
        return;
      }
      goToOtp.mutate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordLogin = useMutation({
    mutationFn: () => loginWithPassword(phone, password),
    onSuccess: (data) => {
      if (!data?.access || !data?.refresh || !data?.user) {
        toast.error(t("auth.errBadResponse"));
        return;
      }
      finishLogin(data, "password");
        startResendCooldown(e.retryAfter);
        toast.error(t("auth.resendTimerHint", { seconds: e.retryAfter }));
        return;
      }
      toast.error(e.message);
    },
  });

  const verify = useMutation({
    mutationFn: () => verifyPhoneCode(phone, code.join(""), authIntent),
    onSuccess: (data) => {
      if (!data?.access || !data?.refresh || !data?.user) {
        toast.error(t("auth.errBadResponse"));
        return;
      }
      setSession(data.access, data.refresh, data.user, data.session_id);
      if (data.user.has_password === false) {
        setPendingAuth(data);
        setStep("set-password");
        return;
      }
      finishLogin(data, "phone");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePassword = useMutation({
    mutationFn: () => setPassword(newPassword),
    onSuccess: (res) => {
      toast.success(res.detail);
      if (!pendingAuth) return;
      trackAuthSuccess({
        isNewUser: Boolean(pendingAuth.is_new_user),
        method: "phone",
      });
      setSession(pendingAuth.access, pendingAuth.refresh, res.user);
      void router
        .navigate({
          to: needsOnboarding(res.user) ? "/onboarding" : "/",
        })
        .then(() => queryClient.invalidateQueries())
        .catch(() => queryClient.invalidateQueries());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const skipPasswordSetup = () => {
    if (pendingAuth) finishLogin(pendingAuth, "phone");
  };

  const busy =
    googleBusy ||
    continuePhone.isPending ||
    goToOtp.isPending ||
    passwordLogin.isPending ||
    verify.isPending ||
    savePassword.isPending;

  const header = phoneAuthEnabled
    ? {
        phone: { kicker: t("auth.login"), title: t("auth.title"), desc: t("auth.subtitlePhone") },
        password: {
          kicker: t("auth.login"),
          title: t("auth.passwordTitle"),
          desc: t("auth.passwordSubtitle", { phone: `+998 ${formatUzLocalPhone(phone)}` }),
        },
        code: {
          kicker: t("auth.verify"),
          title: t("auth.codeTitle"),
          desc:
            deliveryMode === "app"
              ? t("auth.codeSubtitleApp", { phone: `+998 ${formatUzLocalPhone(phone)}` })
              : t("auth.codeSubtitleSms", { phone: `+998 ${formatUzLocalPhone(phone)}` }),
        },
        "set-password": {
          kicker: t("auth.optional"),
          title: t("auth.setPasswordTitle"),
          desc: t("auth.setPasswordSubtitle"),
        },
      }[step]
    : {
        kicker: t("auth.login"),
        title: t("auth.title"),
        desc: t("auth.subtitleGoogle"),
      };

  const primaryAction = () => {
    if (step === "phone") {
      if (phone.length < 9) {
        toast.error(t("auth.errPhone"));
        return;
      }
      continuePhone.mutate();
      return;
    }
    if (step === "password") {
      if (password.length < 8) {
        toast.error(t("auth.errPasswordShort"));
        return;
      }
      passwordLogin.mutate();
      return;
    }
    if (step === "code") {
      if (code.join("").length < 4) {
        toast.error(t("auth.errCode"));
        return;
      }
      verify.mutate();
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("auth.errPasswordShort"));
      return;
    }
    savePassword.mutate();
  };

  const primaryLabel = {
    phone: t("auth.continue"),
    password: t("auth.login"),
    code: t("auth.verify"),
    "set-password": t("auth.savePassword"),
  }[step];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background lg:grid lg:grid-cols-2">
      <AuthMarketingPanel />

      <div className="flex min-h-[100dvh] flex-col justify-center px-6 py-10 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-baseline gap-1 lg:hidden">
            <span className="text-2xl font-bold tracking-tight">mysaloon</span>
            <span className="text-base font-bold text-muted-foreground">.uz</span>
          </div>

          <div key={step} className="auth-form-stagger">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {header.kicker}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{header.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{header.desc}</p>

            <div className="mt-8">
              {!phoneAuthEnabled ? (
                <div className="space-y-4">
                  {googleClientId ? (
                    <GoogleSignInButton
                      clientId={googleClientId}
                      emphasized
                      busy={busy}
                      onBusyChange={setGoogleBusy}
                      onSuccess={(data) => {
                        if (!data?.access || !data?.refresh || !data?.user) {
                          toast.error(t("auth.errBadResponse"));
                          return;
                        }
                        finishLogin(data, "google");
                      }}
                    />
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-border bg-surface px-4 py-5 text-sm text-muted-foreground">
                      {t("auth.googleNotConfigured")}
                    </div>
                  )}
                  <AuthMethodDivider />
                  <div className="opacity-55 saturate-50">
                    <PhoneSignInComingSoon />
                  </div>
                </div>
              ) : null}

              {phoneAuthEnabled && step === "phone" ? (
                <div>
                  <label
                    htmlFor="auth-phone"
                    className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {t("auth.phone")}
                  </label>
                  <div className="mt-2 flex h-14 items-stretch overflow-hidden rounded-2xl border-2 border-border bg-background focus-within:border-foreground">
                    <span className="flex shrink-0 items-center border-r border-border px-4 text-sm font-bold tabular-nums">
                      +998
                    </span>
                    <input
                      id="auth-phone"
                      type="tel"
                      inputMode="numeric"
                      value={formatUzLocalPhone(phone)}
                      disabled={busy}
                      onChange={(e) => setPhone(parseUzLocalPhone(e.target.value))}
                      placeholder="90-123-45-67"
                      className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-bold leading-none placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>
              ) : null}

              {phoneAuthEnabled && step === "password" ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-password"
                      className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                    >
                      {t("auth.password")}
                    </label>
                    <div className="mt-2 flex h-14 items-stretch overflow-hidden rounded-2xl border-2 border-border bg-background focus-within:border-foreground">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        disabled={busy}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-bold leading-none focus:outline-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="flex shrink-0 items-center px-4 text-muted-foreground"
                        aria-label="Toggle password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <OtpResendTimer
                    seconds={resendSeconds}
                    busy={busy}
                    idleLabel={t("auth.loginWithOtp")}
                    onResend={requestOtpCode}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep("phone")}
                    className="w-full text-center text-xs font-bold text-muted-foreground underline disabled:opacity-60"
                  >
                    {t("auth.changePhone")}
                  </button>
                </div>
              ) : null}

              {phoneAuthEnabled && step === "code" ? (
                <div>
                  {appDeliveryCode ? (
                    <div className="mb-6 rounded-2xl border-2 border-dashed border-foreground/30 bg-surface px-4 py-4 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {t("auth.debugCode")}
                      </p>
                      <p className="mt-2 font-mono text-3xl font-bold tracking-[0.35em]">{appDeliveryCode}</p>
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
                          if (v && i < 3) document.getElementById(`otp-${i + 1}`)?.focus();
                        }}
                        id={`otp-${i}`}
                        className="h-16 w-14 rounded-2xl border-2 border-border bg-background text-center text-2xl font-bold focus:border-foreground focus:outline-none disabled:opacity-60"
                      />
                    ))}
                  </div>
                  <div className="mt-6">
                    <OtpResendTimer
                      seconds={resendSeconds}
                      busy={busy}
                      idleLabel={t("auth.resendCode")}
                      onResend={requestOtpCode}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setStep("phone");
                      setCode(["", "", "", ""]);
                      setAppDeliveryCode(null);
                    }}
                    className="mt-3 w-full text-center text-xs font-bold text-muted-foreground underline disabled:opacity-60"
                  >
                    {t("auth.changePhone")}
                  </button>
                </div>
              ) : null}

              {phoneAuthEnabled && step === "set-password" ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-new-password"
                      className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                    >
                      {t("auth.newPassword")}
                    </label>
                    <div className="mt-2 flex h-14 items-stretch overflow-hidden rounded-2xl border-2 border-border bg-background focus-within:border-foreground">
                      <input
                        id="auth-new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        disabled={busy}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("auth.passwordMin")}
                        className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-bold leading-none focus:outline-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((s) => !s)}
                        className="flex shrink-0 items-center px-4 text-muted-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{t("auth.passwordHint")}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={skipPasswordSetup}
                    className="w-full text-center text-sm font-bold text-muted-foreground underline disabled:opacity-60"
                  >
                    {t("auth.skipPassword")}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-8">
              {phoneAuthEnabled && step !== "set-password" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={primaryAction}
                  className={cn(
                    "auth-cta neo-cta w-full bg-primary py-4 text-sm font-bold tracking-wide text-primary-foreground disabled:opacity-60 lg:rounded-2xl lg:bg-foreground lg:text-background",
                  )}
                >
                  {busy ? t("auth.loading") : primaryLabel}
                </button>
              ) : null}
              {phoneAuthEnabled && step === "set-password" ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={primaryAction}
                    className="auth-cta w-full rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background disabled:opacity-60"
                  >
                    {busy ? t("auth.loading") : primaryLabel}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={skipPasswordSetup}
                    className="auth-cta w-full rounded-2xl border-2 border-border py-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-60"
                  >
                    {t("auth.skipPassword")}
                  </button>
                </div>
              ) : null}
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              {t("auth.privacyPrefix")}{" "}
              <a href="/privacy" className="font-bold underline transition-opacity hover:opacity-80">
                {t("auth.privacyLink")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
