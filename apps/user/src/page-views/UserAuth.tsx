"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/navigation";
import { useQuery } from "@tanstack/react-query";
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
  MapPin,
  User,
  Phone,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  apiFetch,
  formatFetchError,
  formatHttpApiError,
  parseResponseBody,
  setTokens,
} from "@/lib/api";
import { userAuthMessages } from "@/lib/i18n/user-auth";
import { barberWebUrl } from "@/lib/public-urls";
import { fetchUzRegions } from "@/lib/uz-regions";
import { useLocale } from "@/providers/locale-provider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NeoPage } from "@/components/neo/NeoPrimitives";

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
  const [region, setRegion] = useState("");
  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: fetchUzRegions,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const barberAuthUrl = barberWebUrl("/auth");

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
      const data = await parseResponseBody(res);
      if (!res.ok) {
        setErr(formatHttpApiError(res, data, t.errLoginFail));
        return;
      }
      const tok = data as { access?: string; refresh?: string };
      if (!tok.access || !tok.refresh) {
        setErr(t.errLoginFail);
        return;
      }
      setTokens(tok.access, tok.refresh);
      router.push(nextPath());
    } catch (e) {
      setErr(formatFetchError(e, t.errLoginFail));
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
          region: region || undefined,
        }),
      });
      const data = await parseResponseBody(res);
      if (!res.ok) {
        setErr(formatHttpApiError(res, data, t.errSignupFail));
        return;
      }
      const loginRes = await apiFetch("/api/v1/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const tok = await parseResponseBody(loginRes);
      if (!loginRes.ok) {
        setErr(formatHttpApiError(loginRes, tok, t.errSignupLoginFail));
        return;
      }
      const tokens = tok as { access?: string; refresh?: string };
      if (!tokens.access || !tokens.refresh) {
        setErr(t.errSignupLoginFail);
        return;
      }
      setTokens(tokens.access, tokens.refresh);
      router.push(nextPath());
    } catch (e) {
      setErr(formatFetchError(e, t.errSignupFail));
    } finally {
      setLoading(false);
    }
  };

  const features = [t.authFeature1, t.authFeature2, t.authFeature3];

  return (
    <NeoPage className="user-auth-shell relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.6]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 0% 0%, oklch(0.78 0.13 80 / 0.18), transparent 55%), radial-gradient(ellipse 70% 60% at 100% 20%, oklch(0.18 0.012 60 / 0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.14 0.008 60 / 0.12), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 texture-grid"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
        {/* Hero — desktop */}
        <aside className="relative hidden flex-col justify-between border-r-2 border-border bg-surface px-10 py-12 lg:flex lg:w-[44%] xl:w-[40%] lg:px-12 xl:px-14">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-border bg-primary shadow-card">
              <Scissors className="h-6 w-6 text-background" />
            </div>
            <h1 className="mt-10 text-4xl font-extrabold tracking-tight text-foreground xl:text-5xl">
              {t.title}
            </h1>
            <p className="mt-3 text-sm font-medium text-foreground/80">{t.subtitle}</p>
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
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>MyBarber</span>
          </div>
        </aside>

        {/* Form column */}
        <div className="flex min-h-0 flex-1 flex-col pt-safe">
          <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:justify-end lg:px-10 lg:pt-10">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-primary shadow-soft">
                <Scissors className="h-5 w-5 text-background" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">{t.langHint}</span>
              <LanguageSwitcher />
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-4 pb-safe pt-2 sm:px-6 lg:justify-center lg:overflow-visible lg:px-10 lg:pb-16">
            <div className="w-full sm:mx-auto sm:max-w-[420px]">
              <Tabs
                value={mode}
                onValueChange={(v) => {
                  setMode(v as "login" | "signup");
                  setErr(null);
                }}
                className="w-full"
              >
                <TabsList className="neo-panel grid h-12 w-full grid-cols-2 rounded-xl p-1">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg text-sm font-extrabold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-soft"
                  >
                    {t.loginTitle}
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg text-sm font-extrabold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-soft"
                  >
                    {t.signUp}
                  </TabsTrigger>
                </TabsList>

                <div className="neo-panel mt-4 p-4 sm:mt-8 sm:p-6 md:p-8">
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
                        className="h-12 w-full rounded-2xl border-0 bg-foreground text-base font-semibold text-background shadow-luxury hover:bg-foreground/90"
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
                      className="space-y-3 sm:space-y-4"
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
                        <Label htmlFor="su-region" className="text-xs font-medium text-muted-foreground">
                          Viloyat
                        </Label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <select
                            id="su-region"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="h-11 w-full appearance-none rounded-xl border border-border/80 bg-background/60 pl-10 pr-9 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">Viloyatni tanlang</option>
                            {regions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Viloyat salon katalogi va booking hudud tekshiruvini aniq ishlatadi.
                        </p>
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
                        className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border-0 bg-foreground text-base font-semibold text-background shadow-luxury hover:bg-foreground/90"
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

              <Separator className="my-6 bg-border/60 sm:my-8" />

              <p className="text-center text-sm text-muted-foreground">
                <a
                  href={barberAuthUrl}
                  className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                  rel={barberAuthUrl.startsWith("http") ? "noreferrer" : undefined}
                >
                  {t.barberLoginLink}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </NeoPage>
  );
}
