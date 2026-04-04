"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

const PUBLIC_PREFIX = "/barber/auth";

function isPublicBarberPath(pathname: string): boolean {
  return pathname === PUBLIC_PREFIX || pathname.startsWith(`${PUBLIC_PREFIX}/`);
}

function BarberAuthGuardProtected({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      setAllowed(true);
    } else {
      const next =
        typeof window !== "undefined"
          ? `${pathname}${window.location.search}`
          : pathname;
      router.replace(`/barber/auth?next=${encodeURIComponent(next)}`);
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}

/** Barcha `/barber/*` uchun: `/barber/auth` dan tashqari yo‘llar token talab qiladi. */
export function BarberAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublicBarberPath(pathname)) {
    return <>{children}</>;
  }
  return <BarberAuthGuardProtected>{children}</BarberAuthGuardProtected>;
}
