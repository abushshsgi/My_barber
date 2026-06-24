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
import { formatUzPhoneE164, looksLikeLoginEmail, validateUzPhoneField } from "@/lib/phone";
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
    const loginId = looksLikeLoginEmail(loginEmail.trim())
      ? email
      : formatUzPhoneE164(loginEmail);
    setLoadingLogin(true);
    try {
      const res = await apiFetch("/api/v1/barber/auth/token/", {
        method: "POST",
        body: JSON.stringify(
          looksLikeLoginEmail(loginEmail.trim())
            ? { email: loginId, password: loginPassword }
            : { phone: loginId, password: loginPassword },
        ),
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
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;
    if (!hasEmail && !hasPhone) {
      setEmailError("Email yoki telefon kiriting.");
      return false;
    }

    if (hasEmail) {
      const formatErr = validateEmailField(email);
      if (formatErr) {
        setEmailError(formatErr);
        return false;
      }
    } else {
      setEmailError(null);
    }

    if (hasPhone) {
      const phoneFormatErr = validateUzPhoneField(phone);
      if (phoneFormatErr) {
        setPhoneError(phoneFormatErr);
        return false;
      }
    } else {
      setPhoneError(null);
    }

    setCheckingAvailability(true);
    try {
      const result = await checkBarberAvailability({
        email: hasEmail ? email : undefined,
        phone: hasPhone ? phone : undefined,
      });
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
    if (loadingSignup) return;
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

    const phoneE164 = signupPhone.trim() ? formatUzPhoneE164(signupPhone) : "";
    const draft = {
      full_name: signupName.trim(),
      phone: phoneE164,
      email: signupEmail.trim() ? normalizeEmail(signupEmail) : "",
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
      if (signupPhone.trim()) await runAvailabilityCheck(signupEmail, signupPhone);
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
      if (signupEmail.trim()) await runAvailabilityCheck(signupEmail, signupPhone);
      return;
    }
    const formatErr = validateUzPhoneField(signupPhone);
    if (formatErr) {
      setPhoneError(formatErr);
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
        <div className="mb-4 grid h-11 grid-cols-2 rounded-xl bg-zinc-100 p-1 sm:mb-5 sm:h-12 lg:hidden">
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
                onStep1Next={async () => {
                  const validation = validateSignupIdentity({
                    fullName: signupName,
                    phone: signupPhone,
                    email: signupEmail,
                    password: signupPassword,
                    flow: flow ?? "owner",
                  });
                  if (validation) {
                    if (validation.includes("Email")) setEmailError(validation);
                    else if (validation.includes("telefon") || validation.includes("Telefon"))
                      setPhoneError(validation);
                    else setError(validation);
                    return false;
                  }
                  return runAvailabilityCheck(signupEmail, signupPhone);
                }}
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
