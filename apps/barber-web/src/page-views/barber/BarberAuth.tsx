"use client";

import { useState } from "react";
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
import { apiFetch, setTokens } from "@/lib/api";

const STEPS = 4;

function parseRegisterError(data: unknown): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    if (typeof d.email === "object" && d.email !== null) {
      const e = (d.email as string[])[0];
      if (e) return String(e);
    }
    if (typeof d.non_field_errors === "object" && Array.isArray(d.non_field_errors)) {
      return String(d.non_field_errors[0] ?? "Xato");
    }
    const parts = Object.entries(d)
      .filter(([k]) => k !== "detail")
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join("; ");
    if (parts) return parts;
  }
  return "Ro'yxatdan o'tishda xato";
}

export default function BarberAuth() {
  const router = useRouter();
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
      setErr("Brauzer joylashuvni qo‘llab-quvvatlamaydi. Quyida lat/lng qo‘lda kiriting.");
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
        setErr(
          "Joylashuv olinmadi. Ruxsat bering yoki quyidagi maydonlarga lat/lng kiriting."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
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
        const detail = (data as { detail?: string }).detail;
        setErr(typeof detail === "string" ? detail : "Xato");
        return;
      }
      setTokens(data.access, data.refresh);
      let dest = "/barber";
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
        setErr("Ism, email va kamida 8 belgili parol kiriting.");
        return;
      }
      if (!region) {
        setErr("O'zbekiston viloyatini tanlang.");
        return;
      }
    }
    if (signupStep === 2) {
      const la = parseFloat(lat);
      const ln = parseFloat(lng);
      if (Number.isNaN(la) || Number.isNaN(ln)) {
        setErr("Joylashuvni oling yoki lat/lng kiriting.");
        return;
      }
      if (!(-90 <= la && la <= 90) || !(-180 <= ln && ln <= 180)) {
        setErr("latitude / longitude noto‘g‘ri.");
        return;
      }
    }
    if (signupStep === 3) {
      if (hasSalon === null) {
        setErr("«Saloningiz bormi?» savoliga javob bering.");
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
      setErr("Viloyatni tanlang.");
      return;
    }
    if (hasSalon === null) {
      setErr("Salon tanlovi yo‘q.");
      return;
    }
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) {
      setErr("Joylashuv kerak.");
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
        setErr(parseRegisterError(data));
        return;
      }
      const tr = await apiFetch("/api/v1/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const tok = await tr.json();
      if (!tr.ok) {
        setErr((tok as { detail?: string }).detail || "Kirish muvaffaqiyatsiz");
        return;
      }
      setTokens(tok.access, tok.refresh);
      router.push(hasSalon ? "/barber/salon" : "/barber/salon/create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-3">
            <Scissors className="h-8 w-8 text-gold-foreground" />
          </div>
          <h1 className="text-2xl font-bold">MyBarber</h1>
          <p className="text-sm text-muted-foreground mt-1">Sartaroshlar uchun</p>
        </div>

        {err && <p className="text-sm text-destructive mb-2 text-center">{err}</p>}

        {mode === "login" ? (
          <Card className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-center">Kirish</h2>
            <Input
              placeholder="Email"
              className="rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative">
              <Input
                placeholder="Parol"
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
              Kirish
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Akkaunt yo&apos;qmi?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-accent font-medium"
              >
                Ro&apos;yxatdan o&apos;tish
              </button>
            </p>
          </Card>
        ) : (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Ro&apos;yxatdan o&apos;tish</h2>
              <span className="text-xs text-muted-foreground">
                {signupStep}/{STEPS}
              </span>
            </div>
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
                  placeholder="To‘liq ism"
                  className="rounded-xl"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  placeholder="Telefon (ixtiyoriy)"
                  className="rounded-xl"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  className="rounded-xl"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  placeholder="Parol (kamida 8 belgi)"
                  type="password"
                  className="rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Viloyat</label>
                  <Select value={region || undefined} onValueChange={setRegion}>
                    <SelectTrigger className="rounded-xl w-full">
                      <SelectValue placeholder="Viloyatni tanlang" />
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
                <p className="text-sm text-muted-foreground">
                  Tasdiqlash va keyingi qadamlar uchun joylashuv majburiy.
                </p>
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
                      Olinmoqda...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Joylashuvni olish (GPS)
                    </>
                  )}
                </Button>
                {geoStatus === "ok" && (
                  <p className="text-xs text-success font-medium">Joylashuv saqlandi.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="latitude"
                    className="rounded-xl"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                  <Input
                    placeholder="longitude"
                    className="rounded-xl"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  GPS ishlamasa, xaritadan nuqtani qo‘lda kiriting.
                </p>
              </div>
            )}

            {signupStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-center">Saloningiz bormi?</p>
                <p className="text-xs text-muted-foreground text-center">
                  Ha — mavjud salonga qo‘shilasiz (joylashuv tekshiriladi). Yo‘q — o‘zingiz salon
                  yaratasiz.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={hasSalon === true ? "default" : "outline"}
                    className={`rounded-xl h-12 ${hasSalon === true ? "gold-gradient text-gold-foreground border-0" : ""}`}
                    onClick={() => setHasSalon(true)}
                  >
                    Ha
                  </Button>
                  <Button
                    type="button"
                    variant={hasSalon === false ? "default" : "outline"}
                    className={`rounded-xl h-12 ${hasSalon === false ? "gold-gradient text-gold-foreground border-0" : ""}`}
                    onClick={() => setHasSalon(false)}
                  >
                    Yo‘q
                  </Button>
                </div>
              </div>
            )}

            {signupStep === 4 && (
              <div className="text-center py-2 space-y-2 text-sm">
                <p className="font-semibold">Ma&apos;lumotlarni tekshiring</p>
                <ul className="text-left text-muted-foreground text-xs space-y-1 rounded-xl bg-muted/40 p-3">
                  <li>Ism: {fullName}</li>
                  <li>Email: {email}</li>
                  <li>
                    Viloyat: {UZ_REGIONS.find((r) => r.value === region)?.label ?? region}
                  </li>
                  <li>
                    Joylashuv: {lat}, {lng}
                  </li>
                  <li>
                    Salon:{" "}
                    {hasSalon
                      ? "Keyin salon yo‘li sahifasi (mavjud salonga qo‘shilish va boshqalar)"
                      : "Yangi salon yaratish sahifasi"}
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
                Davom etish
              </Button>
            ) : (
              <Button
                onClick={submitSignup}
                disabled={loading}
                className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
              >
                {loading ? "Jo‘natilmoqda..." : "Ro‘yxatdan o‘tish"}
              </Button>
            )}

            {signupStep === 1 && (
              <p className="text-center text-sm text-muted-foreground">
                Akkaunt bormi?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-accent font-medium"
                >
                  Kirish
                </button>
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
