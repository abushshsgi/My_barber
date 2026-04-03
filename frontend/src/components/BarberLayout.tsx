"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarberBottomNav } from "./BarberBottomNav";
import { getAccessToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

export function BarberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      setAllowed(true);
    } else {
      router.replace("/barber/auth");
    }
    setReady(true);
  }, [router]);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <BarberBottomNav />
    </div>
  );
}
