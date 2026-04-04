"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Eye, EyeOff } from "lucide-react";
import { apiFetch, setTokens } from "@/lib/api";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-3">
            <Shield className="h-8 w-8 text-gold-foreground" />
          </div>
          <h1 className="text-2xl font-bold">MyBarber Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Faqat admin akkaunt bilan kirish</p>
        </div>

        {err && <p className="text-sm text-destructive mb-2 text-center">{err}</p>}

        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-center">Kirish</h2>
          <Input
            placeholder="Email"
            className="rounded-xl"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <Input
              placeholder="Parol"
              type={showPass ? "text" : "password"}
              className="rounded-xl pr-10"
              autoComplete="current-password"
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
            onClick={() => void handleLogin()}
            disabled={loading}
            className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
          >
            Kirish
          </Button>
        </Card>
      </div>
    </div>
  );
}
