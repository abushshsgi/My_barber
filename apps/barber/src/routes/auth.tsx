import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch, setBarberTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Scissors } from "lucide-react";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { FlowOptionCard } from "@/components/auth/FlowOptionCard";
import {
  extractApiError,
  normalizeEmail,
  parseJsonSafe,
  validateLogin,
  validateSignupIdentity,
  type SignupFlow,
} from "@/lib/auth-ui";
import { saveSignupDraft } from "@/lib/signup-draft";
import { FLOW_IDENTITY_META, SIGNUP_FLOW_PATH } from "@/lib/barber-flow-config";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [flow, setFlow] = useState<SignupFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      if (!res.ok) throw new Error(extractApiError(body, "Kirish amalga oshmadi."));
      const data = body as { access?: string; refresh?: string };
      if (!data.access || !data.refresh) throw new Error("Token qaytmadi.");
      setBarberTokens(data.access, data.refresh);
      await navigate({ to: "/barber" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoadingLogin(false);
    }
  };

  const onSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      saveSignupDraft({
        full_name: signupName.trim(),
        phone: signupPhone.trim() || undefined,
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

  const selectedMeta = flow ? FLOW_IDENTITY_META[flow] : null;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto w-full max-w-[960px] rounded-3xl border border-border bg-card shadow-xl overflow-hidden grid md:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden md:flex flex-col justify-between bg-zinc-900 text-zinc-100 p-8">
          <div>
            <div className="size-10 rounded-xl bg-amber-100 text-zinc-900 flex items-center justify-center">
              <Scissors className="size-5" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold leading-tight">
              {selectedMeta ? selectedMeta.heroTitle : "Barber kabineti"}
            </h1>
            <p className="mt-3 text-sm text-zinc-300 max-w-sm">
              {selectedMeta
                ? selectedMeta.heroSubtitle
                : "Xavfsiz autentifikatsiya oqimi. Kirish yoki ro'yxatdan o'tishni tanlang."}
            </p>
            {selectedMeta && (
              <div
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${selectedMeta.accentClass}`}
              >
                {selectedMeta.badge}
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-400">MyBarber · Auth Gateway</div>
        </div>

        <div className="p-5 sm:p-8">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "login" | "signup")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-medium">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg font-medium">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={onLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Parol</Label>
                  <PasswordInput
                    id="login-password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>
                <AuthErrorAlert error={error} />
                <Button
                  type="submit"
                  className="w-full h-11 bg-zinc-900 text-amber-100 hover:bg-zinc-800"
                  disabled={loadingLogin}
                >
                  {loadingLogin ? "Kutilmoqda..." : "Kirish"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={onSignupSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Ism-familiya</Label>
                    <Input
                      id="signup-name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Ism Familya"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefon (ixtiyoriy)</Label>
                    <Input
                      id="signup-phone"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder="+998..."
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="barber@example.com"
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Parol</Label>
                  <PasswordInput
                    id="signup-password"
                    value={signupPassword}
                    onChange={setSignupPassword}
                    autoComplete="new-password"
                    placeholder="Kamida 8 belgi"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Signup yo'li</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <FlowOptionCard flow="owner" selected={flow === "owner"} onSelect={setFlow} />
                    <FlowOptionCard
                      flow="employee"
                      selected={flow === "employee"}
                      onSelect={setFlow}
                    />
                    <FlowOptionCard
                      flow="mybarber"
                      selected={flow === "mybarber"}
                      onSelect={setFlow}
                    />
                    <FlowOptionCard
                      flow="independent"
                      selected={flow === "independent"}
                      onSelect={setFlow}
                    />
                  </div>
                </div>

                <AuthErrorAlert error={error} />
                <Button
                  type="submit"
                  className="w-full h-11 bg-zinc-900 text-amber-100 hover:bg-zinc-800"
                  disabled={loadingSignup}
                >
                  {loadingSignup ? "Kutilmoqda..." : "Davom etish"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
