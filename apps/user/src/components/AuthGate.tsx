"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { getAccessToken } from "@/lib/api";

export function AuthGate({
  children,
  title = "Tizimga kiring",
  description = "Bu sahifa uchun mijoz akkaunti kerak.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  if (!getAccessToken()) {
    const next =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-foreground text-background shadow-luxury">
          <Lock className="h-7 w-7" />
        </div>
        <div className="max-w-[28ch]">
          <p className="font-display text-xl font-semibold tracking-tight text-foreground">
            {title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <a
          href={`/auth?next=${encodeURIComponent(next)}`}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-semibold text-background shadow-luxury transition active:scale-[0.98]"
        >
          Kirish
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
