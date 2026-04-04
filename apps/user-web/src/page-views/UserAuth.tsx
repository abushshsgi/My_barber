"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scissors, Eye, EyeOff } from "lucide-react";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { apiFetch, formatApiError, setTokens } from "@/lib/api";
import { userAuthMessages } from "@/lib/i18n/user-auth";
import { barberWebUrl } from "@/lib/public-urls";
import { useLocale } from "@/providers/locale-provider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import Link from "next/link";

export default function UserAuth() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useMemo(() => userAuthMessages[locale], [locale]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");

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
    if (!region) {
      setErr(t.errRegion);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined,
          region,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data, t.errSignupFail));
        return;
      }
      const loginRes = await apiFetch("/api/v1/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="text-xs text-muted-foreground">{t.langHint}</span>
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-3">
            <Scissors className="h-8 w-8 text-gold-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        {err && <p className="text-sm text-destructive mb-2 text-center">{err}</p>}

        {mode === "login" ? (
          <Card className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-center">{t.loginTitle}</h2>
            <Input
              placeholder={t.emailPh}
              className="rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative">
              <Input
                placeholder={t.passwordPh}
                type={showPass ? "text" : "password"}
                className="rounded-xl pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
            >
              {t.signIn}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t.noAccount}{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-accent font-medium"
              >
                {t.signUp}
              </button>
            </p>
            <p className="text-center text-xs">
              <Link href={barberWebUrl("/auth")} className="text-muted-foreground underline">
                {t.barberLoginLink}
              </Link>
            </p>
          </Card>
        ) : (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-lg font-semibold text-center flex-1">{t.signupTitle}</h2>
            </div>
            <p className="text-xs text-muted-foreground text-center -mt-1">
              {t.langHint}: {locale.toUpperCase()}
            </p>
            <Input
              placeholder={t.namePh}
              className="rounded-xl"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              placeholder={t.phonePh}
              className="rounded-xl"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              placeholder={t.emailPh}
              className="rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder={t.passwordMinPh}
              type="password"
              className="rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{t.regionLabel}</label>
              <Select value={region || undefined} onValueChange={setRegion}>
                <SelectTrigger className="rounded-xl w-full">
                  <SelectValue placeholder={t.regionPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {UZ_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => void handleSignup()}
              disabled={loading}
              className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
            >
              {t.create}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t.haveAccount}{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-accent font-medium"
              >
                {t.signIn}
              </button>
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
