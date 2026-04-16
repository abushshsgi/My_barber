"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Scissors,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiFetch, formatApiError, setTokens } from "@/lib/api";
import { userAuthMessages } from "@/lib/i18n/user-auth";
import { barberWebUrl } from "@/lib/public-urls";
import { useLocale } from "@/providers/locale-provider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function UserAuth() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useMemo(() => userAuthMessages[locale], [locale]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassLogin, setShowPassLogin] = useState(false);
  const [showPassSignup, setShowPassSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const nextPath = () => {
    if (typeof window === "undefined") return "/";
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") ? n : "/";
  };

  const handleLogin = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data, t.errLoginFail));
        return;
      }
      setTokens(data.access, data.refresh);
      router.push(nextPath());
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setErr(null);
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setErr(t.errSignupFields);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          phone: phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data, t.errSignupFail));
        return;
      }
      const loginRes = await apiFetch("/api/v1/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const tok = await loginRes.json();
      if (!loginRes.ok) {
        setErr(t.errSignupLoginFail);
        return;
      }
      setTokens(tok.access, tok.refresh);
      router.push(nextPath());
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const features = [t.authFeature1, t.authFeature2, t.authFeature3];

  return (
    <div className="user-auth-shell relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 0% 0%, hsl(172 45% 22% / 0.45), transparent 55%), radial-gradient(ellipse 70% 60% at 100% 20%, hsl(217 40% 20% / 0.35), transparent 50%), radial-gradient(ellipse 60% 50% at 50% 100%, hsl(190 35% 18% / 0.25), transparent 45%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-size:28px_28px] [background-image:linear-gradient(hsl(217_28%_18%/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(217_28%_18%/0.5)_1px,transparent_1px)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Hero — desktop */}
        <aside className="relative hidden flex-col justify-between border-border/60 bg-card/30 px-10 py-12 backdrop-blur-md lg:flex lg:w-[44%] xl:w-[40%] lg:border-r lg:px-12 xl:px-14">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gold-gradient shadow-lg ring-1 ring-white/10">
              <Scissors className="h-6 w-6 text-gold-foreground" />
            </div>
            <h1 className="mt-10 text-3xl font-bold tracking-tight text-foreground xl:text-4xl">
              {t.title}
            </h1>
            <p className="mt-2 text-sm font-medium text-primary/90">{t.subtitle}</p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">{t.authPanelLead}</p>
            <ul className="mt-8 space-y-3">
              {features.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-foreground/90">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="leading-snug">{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>MyBarber</span>
          </div>
        </aside>

        {/* Form column */}
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:justify-end lg:px-10 lg:pt-10">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gold-gradient shadow-md ring-1 ring-white/10">
                <Scissors className="h-5 w-5 text-gold-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">{t.langHint}</span>
              <LanguageSwitcher />
            </div>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-12 pt-2 sm:px-8 lg:px-10 lg:pb-16">
            <div className="w-full max-w-[420px]">
              <Tabs
                value={mode}
                onValueChange={(v) => {
                  setMode(v as "login" | "signup");
                  setErr(null);
                }}
                className="w-full"
              >
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-muted/80 p-1 ring-1 ring-border/60">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg text-sm font-semibold data-[state=active]:gold-gradient data-[state=active]:text-gold-foreground data-[state=active]:shadow-md"
                  >
                    {t.loginTitle}
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg text-sm font-semibold data-[state=active]:gold-gradient data-[state=active]:text-gold-foreground data-[state=active]:shadow-md"
                  >
                    {t.signUp}
                  </TabsTrigger>
                </TabsList>

                <div className="mt-8 rounded-2xl border border-border/80 bg-card/70 p-6 shadow-xl ring-1 ring-white/5 backdrop-blur-md sm:p-8">
                  {err && (
                    <Alert variant="destructive" className="mb-6 border-destructive/40 bg-destructive/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{err}</AlertDescription>
                    </Alert>
                  )}

                  <TabsContent value="login" className="mt-0 outline-none">
                    <form
                      className="space-y-5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleLogin();
                      }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
                          {t.emailPh}
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="login-email"
                            placeholder={t.emailPh}
                            className="h-12 rounded-xl border-border/80 bg-background/60 pl-10 pr-3"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">
                          {t.passwordPh}
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="login-password"
                            placeholder={t.passwordPh}
                            type={showPassLogin ? "text" : "password"}
                            className="h-12 rounded-xl border-border/80 bg-background/60 pl-10 pr-11"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassLogin(!showPassLogin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={showPassLogin ? "Hide password" : "Show password"}
                          >
                            {showPassLogin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="h-12 w-full rounded-xl border-0 text-base font-semibold shadow-lg gold-gradient text-gold-foreground"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t.signIn}
                          </>
                        ) : (
                          t.signIn
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0 outline-none">
                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSignup();
                      }}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="su-name" className="text-xs font-medium text-muted-foreground">
                          {t.namePh}
                        </Label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="su-name"
                            placeholder={t.namePh}
                            className="h-11 rounded-xl border-border/80 bg-background/60 pl-10"
                            autoComplete="name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-phone" className="text-xs font-medium text-muted-foreground">
                          {t.phonePh}
                        </Label>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="su-phone"
                            placeholder={t.phonePh}
                            className="h-11 rounded-xl border-border/80 bg-background/60 pl-10"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-email" className="text-xs font-medium text-muted-foreground">
                          {t.emailPh}
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="su-email"
                            placeholder={t.emailPh}
                            className="h-11 rounded-xl border-border/80 bg-background/60 pl-10"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-pass" className="text-xs font-medium text-muted-foreground">
                          {t.passwordMinPh}
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="su-pass"
                            placeholder={t.passwordMinPh}
                            type={showPassSignup ? "text" : "password"}
                            className="h-11 rounded-xl border-border/80 bg-background/60 pl-10 pr-11"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassSignup(!showPassSignup)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={showPassSignup ? "Hide password" : "Show password"}
                          >
                            {showPassSignup ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl border-0 text-base font-semibold shadow-lg gold-gradient text-gold-foreground"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t.create}
                          </>
                        ) : (
                          t.create
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </div>
              </Tabs>

              <Separator className="my-8 bg-border/60" />

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href={barberWebUrl("/auth")}
                  className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                >
                  {t.barberLoginLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
