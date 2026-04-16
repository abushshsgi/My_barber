"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getBarberAccessToken } from "@/lib/api";

export function BarberAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/auth") return;
    const tok = getBarberAccessToken();
    if (!tok) router.replace("/auth");
  }, [pathname, router]);

  return <>{children}</>;
}

