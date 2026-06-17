import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AuthLoginForm } from "@/components/auth/AuthLoginForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupWizard } from "@/components/auth/SignupWizard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiFetch, setBarberTokens } from "@/lib/api";
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

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      if (!res.ok) throw new Error(extractApiError(body, "Kirish amalga oshmadi.", res));
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
    setLoadingSignup(true);
    try {
      const phoneE164 = signupPhone ? formatUzPhoneE164(signupPhone) : undefined;
      saveSignupDraft({
        full_name: signupName.trim(),
        phone: phoneE164 || undefined,
        email: normalizeEmail(signupEmail),
        password: signupPassword,
        flow,
      });
      await navigate({ to: SIGNUP_FLOW_PATH[flow] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoadingSignup(false);
    }
  };

  const handleEmailBlur = () => {
    if (!signupEmail.trim()) {
      setEmailError(null);
      return;
    }
    setEmailError(validateEmailField(signupEmail));
  };

  const handleTabChange = (v: string) => {
    setTab(v as "login" | "signup");
    setError(null);
    setEmailError(null);
  };

  const loginMotion = tabSlide("login");
  const signupMotion = tabSlide("signup");

  return (
    <TooltipProvider>
      <AuthShell flow={tab === "signup" ? flow : null}>
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg font-medium cursor-pointer">
              Kirish
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg font-medium cursor-pointer">
              Ro'yxatdan o'tish
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-5">
            <AnimatePresence mode="wait">
              {tab === "login" && (
                <motion.div key="login" {...loginMotion}>
                  <AuthLoginForm
                    email={loginEmail}
                    password={loginPassword}
                    error={error}
                    loading={loadingLogin}
                    onEmailChange={setLoginEmail}
                    onPasswordChange={setLoginPassword}
                    onSubmit={onLoginSubmit}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="signup" className="mt-5">
            <AnimatePresence mode="wait">
              {tab === "signup" && (
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
                    emailError={emailError}
                    onStepChange={setSignupStep}
                    onNameChange={setSignupName}
                    onPhoneChange={setSignupPhone}
                    onEmailChange={(v) => {
                      setSignupEmail(v);
                      if (emailError) setEmailError(null);
                    }}
                    onPasswordChange={setSignupPassword}
                    onFlowSelect={setFlow}
                    onEmailBlur={handleEmailBlur}
                    onSubmit={onSignupSubmit}
                    onClearError={() => setError(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </AuthShell>
    </TooltipProvider>
  );
}
