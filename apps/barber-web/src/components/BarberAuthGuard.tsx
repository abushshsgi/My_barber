"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearTokens, getBarberAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";

const PUBLIC_PREFIX = "/auth";

function isPublicBarberPath(pathname: string): boolean {
  return pathname === PUBLIC_PREFIX || pathname.startsWith(`${PUBLIC_PREFIX}/`);
}

function isSetupAllowedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0];
  return (
    p === "/" ||
    p === "/notifications" ||
    p === "/profile" ||
    p.startsWith("/auth") ||
    p.startsWith("/salon/create") ||
    p.startsWith("/salon/join") ||
    p.startsWith("/independent/setup")
  );
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isValidBarberAccessToken(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload) return false;
  const type = typeof payload.type === "string" ? payload.type : "";
  // Must be a barber access token; anything else should not unlock barber-web.
  if (type !== "barber_access") return false;
  const exp = typeof payload.exp === "number" ? payload.exp : null;
  if (!exp) return false;
  // Small clock skew to avoid flapping on boundary.
  const now = Math.floor(Date.now() / 1000);
  return exp > now + 10;
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
      if (!tok || !isValidBarberAccessToken(tok)) {
        clearTokens();
        router.replace(href);
        setAllowed(false);
        setReady(true);
        return;
      }
      // Onboarding gate (backend source of truth)
      const res = await apiFetch("/api/v1/barber/onboarding/status/");
      if (!res.ok) {
        // If token is invalid/expired, force re-login.
        if (res.status === 401 || res.status === 403) {
          clearTokens();
          router.replace(href);
          setAllowed(false);
          setReady(true);
          return;
        }
        // Fallback: if backend is down, keep the user in-app (token is still valid locally).
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
      if (!isComplete) {
        const current = pathname || "/";
        // During onboarding, keep users within Home/Notifications/Profile/Auth + setup pages.
        // Setup pages are still reachable via the Home CTA.
        if (!isSetupAllowedPath(current)) {
          router.replace("/");
          setAllowed(false);
          setReady(true);
          return;
        }
        // If backend requests a specific setup path and user is on a non-setup page, keep them on Home.
        // Home will render a CTA to that required path.
        if (required && current === "/") {
          // allow Home
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
