import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { AuthLoginForm, AUTH_LOGIN_FORM_ID } from "@/components/auth/AuthLoginForm";
import { AuthMobileStickyBar } from "@/components/auth/AuthMobileStickyBar";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { SignupWizard } from "@/components/auth/SignupWizard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiFetch, setBarberTokens } from "@/lib/api";
import { submitEarlyFlowSignup } from "@/lib/barber-signup-flow";
import { checkBarberAvailability, parseFieldErrors } from "@/lib/auth-errors";
import {
  extractApiError,
  formatFetchError,
  normalizeEmail,
  parseJsonSafe,
  validateEmailField,
  validateLogin,
  validateSignupIdentity,
  type SignupFlow,
} from "@/lib/auth-ui";
import { SIGNUP_FLOW_PATH } from "@/lib/barber-flow-config";
import { tabSlide } from "@/lib/motion-presets";
import { formatUzPhoneE164 } from "@/lib/phone";
import { saveSignupDraft } from "@/lib/signup-draft";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState(0);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [flow, setFlow] = useState<SignupFlow | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loginEmailError, setLoginEmailError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginEmailError(null);
    const validation = validateLogin({ email: loginEmail, password: loginPassword });
    if (validation) {
      setError(validation);
      return;
    }
    const email = normalizeEmail(loginEmail);
    setLoadingLogin(true);
    try {
      const res = await apiFetch("/api/v1/barber/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password: loginPassword }),
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        const fields = parseFieldErrors(body);
        if (fields.email) {
          setLoginEmailError(fields.email);
          return;
        }
        throw new Error(extractApiError(body, "Kirish amalga oshmadi.", res));
      }
      const data = body as { access?: string; refresh?: string };
      if (!data.access || !data.refresh) throw new Error("Token qaytmadi.");
      setBarberTokens(data.access, data.refresh);
      await navigate({ to: "/barber" });
    } catch (err) {
      setError(formatFetchError(err, "Kirish amalga oshmadi."));
    } finally {
      setLoadingLogin(false);
    }
  };

  const runAvailabilityCheck = useCallback(async (email: string, phone: string) => {
    const formatErr = validateEmailField(email);
    if (formatErr) {
      setEmailError(formatErr);
      return false;
    }
    setCheckingAvailability(true);
    try {
      const result = await checkBarberAvailability({ email, phone });
      setEmailError(result.emailError);
      setPhoneError(result.phoneError);
      return !result.emailError && !result.phoneError;
    } catch {
      return true;
    } finally {
      setCheckingAvailability(false);
    }
  }, []);

  const onSignupSubmit = async () => {
    setError(null);
    if (!flow) {
      setError("Signup yo'lini tanlang: owner, employee, mybarber yoki independent.");
      return;
    }
    const validation = validateSignupIdentity({
      fullName: signupName,
      phone: signupPhone,
      email: signupEmail,
      password: signupPassword,
      flow,
    });
    if (validation) {
      setError(validation);
      return;
    }

    const available = await runAvailabilityCheck(signupEmail, signupPhone);
    if (!available) return;

    const phoneE164 = signupPhone ? formatUzPhoneE164(signupPhone) : undefined;
    const draft = {
      full_name: signupName.trim(),
      phone: phoneE164 || undefined,
      email: normalizeEmail(signupEmail),
      password: signupPassword,
      flow,
    };

    if (flow === "employee") {
      saveSignupDraft(draft);
      await navigate({ to: SIGNUP_FLOW_PATH[flow] });
      return;
    }

    setLoadingSignup(true);
    try {
      saveSignupDraft(draft);
      await submitEarlyFlowSignup(flow, draft);
      await navigate({ to: SIGNUP_FLOW_PATH[flow] });
    } catch (err) {
      setError(formatFetchError(err, "Ro'yxatdan o'tish amalga oshmadi."));
    } finally {
      setLoadingSignup(false);
    }
  };

  const handleEmailBlur = async () => {
    if (!signupEmail.trim()) {
      setEmailError(null);
      return;
    }
    const formatErr = validateEmailField(signupEmail);
    if (formatErr) {
      setEmailError(formatErr);
      return;
    }
    await runAvailabilityCheck(signupEmail, signupPhone);
  };

  const handlePhoneBlur = async () => {
    if (!signupPhone.trim()) {
      setPhoneError(null);
      return;
    }
    await runAvailabilityCheck(signupEmail, signupPhone);
  };

  const handleTabChange = (v: "login" | "signup") => {
    setTab(v);
    setSignupStep(0);
    setError(null);
    setLoginEmailError(null);
    setEmailError(null);
    setPhoneError(null);
  };

  const loginMotion = tabSlide("login");
  const signupMotion = tabSlide("signup");

  return (
    <TooltipProvider>
      <AuthShell
        flow={tab === "signup" ? flow : null}
        tab={tab}
        signupStep={signupStep}
        onTabChange={handleTabChange}
      >
        {/* Mobile tab switcher */}
        <div className="mb-5 grid h-12 grid-cols-2 rounded-xl bg-zinc-100 p-1 md:hidden">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={cn(
                "cursor-pointer rounded-lg text-sm font-medium transition-all",
                tab === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "login" ? (
            <motion.div key="login" {...loginMotion}>
              <AuthLoginForm
                email={loginEmail}
                password={loginPassword}
                error={error}
                emailError={loginEmailError}
                loading={loadingLogin}
                onEmailChange={setLoginEmail}
                onPasswordChange={setLoginPassword}
                onSubmit={onLoginSubmit}
              />
            </motion.div>
          ) : (
            <motion.div key="signup" {...signupMotion}>
              <SignupWizard
                step={signupStep}
                data={{
                  name: signupName,
                  phone: signupPhone,
                  email: signupEmail,
                  password: signupPassword,
                  flow,
                }}
                error={error}
                loading={loadingSignup}
                checkingAvailability={checkingAvailability}
                emailError={emailError}
                phoneError={phoneError}
                onStepChange={setSignupStep}
                onNameChange={setSignupName}
                onPhoneChange={(v) => {
                  setSignupPhone(v);
                  if (phoneError) setPhoneError(null);
                }}
                onEmailChange={(v) => {
                  setSignupEmail(v);
                  if (emailError) setEmailError(null);
                }}
                onPasswordChange={setSignupPassword}
                onFlowSelect={setFlow}
                onEmailBlur={handleEmailBlur}
                onPhoneBlur={handlePhoneBlur}
                onSubmit={onSignupSubmit}
                onClearError={() => setError(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {tab === "login" && (
          <AuthMobileStickyBar>
            <AuthSubmitButton
              type="submit"
              form={AUTH_LOGIN_FORM_ID}
              loading={loadingLogin}
              disabled={loadingLogin}
              className="h-12 flex-1 rounded-full text-[15px]"
            >
              {loadingLogin ? "Kutilmoqda..." : "Kirish"}
            </AuthSubmitButton>
          </AuthMobileStickyBar>
        )}
      </AuthShell>
    </TooltipProvider>
  );
}
