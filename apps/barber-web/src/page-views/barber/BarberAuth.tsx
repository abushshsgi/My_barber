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
import { Scissors, Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { apiFetch, formatApiError, setTokens } from "@/lib/api";
import { barberAuthMessages } from "@/lib/i18n/barber-auth";
import { userWebUrl } from "@/lib/public-urls";
import { useLocale } from "@/providers/locale-provider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import Link from "next/link";

const STEPS = 4;

export default function BarberAuth() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useMemo(() => barberAuthMessages[locale], [locale]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [hasSalon, setHasSalon] = useState<boolean | null>(null);
  const [region, setRegion] = useState("");

  const requestLocation = () => {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setErr(t.errGeoNoBrowser);
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("error");
        setErr(t.errGeoFailed);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleLogin = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/barber/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data, t.errLoginFail));
        return;
      }
      setTokens(data.access, data.refresh);
      let dest = "/";
      if (typeof window !== "undefined") {
        const n = new URLSearchParams(window.location.search).get("next");
        if (n && n.startsWith("/") && !n.startsWith("//")) {
          dest = n;
        }
      }
      router.push(dest);
    } finally {
      setLoading(false);
    }
  };

  const advanceSignup = () => {
    setErr(null);
    if (signupStep === 1) {
      if (!fullName.trim() || !email.trim() || password.length < 8) {
        setErr(t.errStep1);
        return;
      }
      if (!region) {
        setErr(t.errRegion);
        return;
      }
    }
    if (signupStep === 2) {
      const la = parseFloat(lat);
      const ln = parseFloat(lng);
      if (Number.isNaN(la) || Number.isNaN(ln)) {
        setErr(t.errStep2);
        return;
      }
      if (!(-90 <= la && la <= 90) || !(-180 <= ln && ln <= 180)) {
        setErr(t.errLatLng);
        return;
      }
    }
    if (signupStep === 3) {
      if (hasSalon === null) {
        setErr(t.errSalonChoice);
        return;
      }
    }
    if (signupStep < STEPS) {
      setSignupStep(signupStep + 1);
    }
  };

  const submitSignup = async () => {
    setErr(null);
    if (!region) {
      setErr(t.errSubmitRegion);
      return;
    }
    if (hasSalon === null) {
      setErr(t.errSubmitSalon);
      return;
    }
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) {
      setErr(t.errSubmitLoc);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/barber-register/", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined,
          has_salon: hasSalon,
          latitude: la,
          longitude: ln,
          region,
          staff_count_at_signup: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(formatApiError(data, t.errSignupFail));
        return;
      }
      const tr = await apiFetch("/api/v1/barber/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const tok = await tr.json();
      if (!tr.ok) {
        setErr(formatApiError(tok, t.errLoginFail));
        return;
      }
      setTokens(tok.access, tok.refresh);
      router.push(hasSalon ? "/salon" : "/salon/create");
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
            <p className="text-center text-xs">
              <Link href={userWebUrl("/auth")} className="text-muted-foreground underline">
                {t.userLoginLink}
              </Link>
            </p>
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
          </Card>
        ) : (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <h2 className="text-lg font-semibold">{t.signupTitle}</h2>
              <span className="text-xs text-muted-foreground shrink-0">
                {t.step} {signupStep}/{STEPS}
              </span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1 mb-1">
              {t.langHint}: {locale.toUpperCase()}
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: STEPS }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full ${s <= signupStep ? "bg-accent" : "bg-muted"}`}
                />
              ))}
            </div>

            {signupStep === 1 && (
              <div className="space-y-3">
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
                  type="email"
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
              </div>
            )}

            {signupStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t.geoIntro}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-xl h-11"
                  onClick={requestLocation}
                  disabled={geoStatus === "loading"}
                >
                  {geoStatus === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.geoLoading}
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      {t.geoBtn}
                    </>
                  )}
                </Button>
                {geoStatus === "ok" && (
                  <p className="text-xs text-success font-medium">{t.geoSaved}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder={t.geoLatPh}
                    className="rounded-xl"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                  <Input
                    placeholder={t.geoLngPh}
                    className="rounded-xl"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t.geoManualHint}</p>
              </div>
            )}

            {signupStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-center">{t.salonQuestion}</p>
                <p className="text-xs text-muted-foreground text-center">{t.salonExplain}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={hasSalon === true ? "default" : "outline"}
                    className={`rounded-xl h-12 ${hasSalon === true ? "gold-gradient text-gold-foreground border-0" : ""}`}
                    onClick={() => setHasSalon(true)}
                  >
                    {t.yes}
                  </Button>
                  <Button
                    type="button"
                    variant={hasSalon === false ? "default" : "outline"}
                    className={`rounded-xl h-12 ${hasSalon === false ? "gold-gradient text-gold-foreground border-0" : ""}`}
                    onClick={() => setHasSalon(false)}
                  >
                    {t.no}
                  </Button>
                </div>
              </div>
            )}

            {signupStep === 4 && (
              <div className="text-center py-2 space-y-2 text-sm">
                <p className="font-semibold">{t.reviewTitle}</p>
                <ul className="text-left text-muted-foreground text-xs space-y-1 rounded-xl bg-muted/40 p-3">
                  <li>
                    {t.reviewName}: {fullName}
                  </li>
                  <li>
                    {t.reviewEmail}: {email}
                  </li>
                  <li>
                    {t.reviewRegion}: {UZ_REGIONS.find((r) => r.value === region)?.label ?? region}
                  </li>
                  <li>
                    {t.reviewLoc}: {lat}, {lng}
                  </li>
                  <li>
                    {t.reviewSalon}: {hasSalon ? t.reviewSalonYes : t.reviewSalonNo}
                  </li>
                </ul>
              </div>
            )}

            {signupStep < STEPS ? (
              <Button
                onClick={advanceSignup}
                disabled={loading}
                className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
              >
                {t.continue}
              </Button>
            ) : (
              <Button
                onClick={submitSignup}
                disabled={loading}
                className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
              >
                {loading ? t.submitting : t.signUp}
              </Button>
            )}

            {signupStep === 1 && (
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
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
