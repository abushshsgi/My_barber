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
      <div className="admin-bg admin-bg-grid flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Admin tekshiruvi...</p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="admin-bg admin-bg-grid flex min-h-screen flex-col items-center justify-center p-6 px-4 text-center">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-card/80 p-8 card-shadow-lg backdrop-blur-sm">
          <p className="text-lg font-semibold text-destructive">Kirish rad etildi</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Bu panel faqat <strong className="text-foreground">ADMIN</strong> ro‘li bilan. Mijoz yoki sartarosh
            tokenlari ishlamaydi.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Bosh sahifaga
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
