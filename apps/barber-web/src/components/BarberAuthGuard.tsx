"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, getBarberAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";

const PUBLIC_PREFIX = "/auth";

function isPublicBarberPath(pathname: string): boolean {
  return pathname === PUBLIC_PREFIX || pathname.startsWith(`${PUBLIC_PREFIX}/`);
}

function BarberAuthGuardProtected({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nextUrl =
    typeof window !== "undefined"
      ? `${pathname}${window.location.search}`
      : pathname;
  const loginHref = `/auth?next=${encodeURIComponent(nextUrl)}`;

  useEffect(() => {
    const run = async () => {
      setErr(null);
      const next =
        typeof window !== "undefined"
          ? `${pathname}${window.location.search}`
          : pathname;
      const href = `/auth?next=${encodeURIComponent(next)}`;
      const tok = getBarberAccessToken();
      if (!tok) {
        router.replace(href);
        setAllowed(false);
        setReady(true);
        return;
      }
      // Onboarding gate (backend source of truth)
      const res = await apiFetch("/api/v1/barber/onboarding/status/");
      if (!res.ok) {
        // Fallback: allow page, but show errors on pages themselves.
        setAllowed(true);
        setReady(true);
        return;
      }
      const data = (await res.json()) as {
        is_complete?: boolean;
        required_next_path?: string;
      };
      const isComplete = Boolean(data.is_complete);
      const required = String(data.required_next_path || "").trim();
      if (!isComplete && required) {
        const requiredPathOnly = required.split("?")[0];
        const current = pathname || "/";
        const onRequired =
          current === requiredPathOnly || current.startsWith(`${requiredPathOnly}/`);
        if (!onRequired) {
          router.replace(required);
          setAllowed(false);
          setReady(true);
          return;
        }
      }
      setAllowed(true);
      setReady(true);
    };
    void run().catch((e: unknown) => {
      setErr(e instanceof Error ? e.message : "Guard error");
      setAllowed(true);
      setReady(true);
    });
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground text-center">Tekshirilmoqda…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-destructive max-w-sm">{err}</p>
        <Button onClick={() => router.refresh()} className="rounded-xl">
          Reload
        </Button>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center">
          <LogIn className="h-8 w-8 text-gold-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Kirish talab qilinadi</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sartarosh kabineti ochiq emas. Davom etish uchun avval tizimga kiring.
        </p>
        <Button asChild className="rounded-xl">
          <Link href={loginHref}>Kirish</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

/** `/auth` dan tashqari yo‘llar token talab qiladi. */
export function BarberAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublicBarberPath(pathname)) {
    return <>{children}</>;
  }
  return <BarberAuthGuardProtected>{children}</BarberAuthGuardProtected>;
}
