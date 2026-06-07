import { redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

const PUBLIC_PATHS = ["/auth", "/privacy"];

export function requireAuth(pathname: string) {
  if (typeof window === "undefined") return;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
  if (!isAuthenticated()) {
    throw redirect({ to: "/auth", search: { redirect: pathname } });
  }
}

export function redirectIfAuthenticated() {
  if (typeof window === "undefined") return;
  if (isAuthenticated()) {
    throw redirect({ to: "/" });
  }
}
