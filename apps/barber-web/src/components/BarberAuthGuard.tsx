"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/api";
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

  const nextUrl =
    typeof window !== "undefined"
      ? `${pathname}${window.location.search}`
      : pathname;
  const loginHref = `/auth?next=${encodeURIComponent(nextUrl)}`;

  useEffect(() => {
    const next =
      typeof window !== "undefined"
        ? `${pathname}${window.location.search}`
        : pathname;
    const href = `/auth?next=${encodeURIComponent(next)}`;
    if (getAccessToken()) {
      setAllowed(true);
    } else {
      router.replace(href);
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground text-center">Tekshirilmoqda…</p>
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
