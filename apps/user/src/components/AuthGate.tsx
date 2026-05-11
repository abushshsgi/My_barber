"use client";

import type { ReactNode } from "react";
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <a
          href={`/auth?next=${encodeURIComponent(next)}`}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-luxury"
        >
          Kirish
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
