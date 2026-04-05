"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Eye, EyeOff, Lock, Sparkles } from "lucide-react";
import { apiFetch, clearTokens, setTokens } from "@/lib/api";

export default function AdminLogin() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = () => {
    if (typeof window === "undefined") return "/admin";
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") ? n : "/admin";
  };

  const handleLogin = async () => {
    setErr(null);
    setLoading(true);
    try {
      clearTokens();
      const res = await apiFetch("/api/v1/admin/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr((data as { detail?: string }).detail || "Xato");
        return;
      }
      setTokens(data.access, data.refresh);
      router.push(nextPath());
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen admin-bg admin-bg-grid flex">
      {/* Brand panel — katta ekranda chap kolonka */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between border-r border-border/60 bg-[hsl(232_28%_9%)] p-10 xl:p-14 relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 20%, hsl(262 60% 35% / 0.45), transparent), radial-gradient(ellipse 60% 50% at 80% 80%, hsl(280 50% 30% / 0.35), transparent)",
          }}
        />
        <div className="relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-10 text-3xl xl:text-4xl font-bold tracking-tight text-foreground leading-tight">
            Platforma
            <span className="block text-gold-gradient bg-clip-text text-transparent">
              boshqaruvi
            </span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Faqat tasdiqlangan admin akkauntlari. Mijoz va sartarosh panellaridan alohida xavfsiz kirish.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary/80" />
          <span>MyBarber Admin Console</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center lg:text-left">
            <div className="mx-auto lg:mx-0 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border card-shadow-lg lg:hidden">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Kirish</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Admin email va parol</p>
          </div>

          {err && (
            <p className="text-sm text-destructive text-center lg:text-left rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
              {err}
            </p>
          )}

          <div className="space-y-4 rounded-2xl border border-border/80 bg-card/50 p-6 card-shadow backdrop-blur-sm">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                placeholder="admin@..."
                className="h-11 rounded-lg border-border/80 bg-background/50"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Parol</label>
              <div className="relative">
                <Input
                  placeholder="••••••••"
                  type={showPass ? "text" : "password"}
                  className="h-11 rounded-lg border-border/80 bg-background/50 pr-10"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              onClick={() => void handleLogin()}
              disabled={loading}
              className="h-11 w-full rounded-lg admin-btn-primary border-0 font-semibold"
            >
              {loading ? "Kutilmoqda..." : "Tizimga kirish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
