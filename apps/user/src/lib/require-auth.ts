import { redirect } from "@tanstack/react-router";
import { bootstrapUserSession } from "@/lib/api/client";

const PUBLIC_PATHS = ["/auth", "/privacy"];

export async function requireAuth(pathname: string) {
  if (typeof window === "undefined") return;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
  const ok = await bootstrapUserSession();
  if (!ok) {
    throw redirect({ to: "/auth", search: { redirect: pathname } });
  }
}

export async function redirectIfAuthenticated() {
  if (typeof window === "undefined") return;
  const ok = await bootstrapUserSession();
  if (ok) {
    throw redirect({ to: "/" });
  }
}
