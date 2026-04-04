"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { apiFetch, getAccessToken } from "@/lib/api";

type Me = { role: string; email: string };

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "denied" | "auth">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAccessToken()) {
        router.replace("/auth?next=/admin");
        if (!cancelled) setState("auth");
        return;
      }
      const res = await apiFetch("/api/v1/admin/auth/me/");
      const data = (await res.json().catch(() => ({}))) as Me & { detail?: string };
      if (!res.ok) {
        router.replace("/auth?next=/admin");
        if (!cancelled) setState("auth");
        return;
      }
      if (data.role !== "ADMIN") {
        if (!cancelled) setState("denied");
        return;
      }
      if (!cancelled) setState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "loading" || state === "auth") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Admin tekshiruvi...</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background px-4">
        <p className="text-lg font-semibold text-destructive mb-2">Kirish rad etildi</p>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Bu panel faqat <strong>ADMIN</strong> ro‘li bilan kirgan foydalanuvchilar uchun. Oddiy mijoz yoki sartarosh
          akkaunti bilan admin API ochilmaydi.
        </p>
        <Link href="/" className="text-accent font-medium underline">
          Bosh sahifaga
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
