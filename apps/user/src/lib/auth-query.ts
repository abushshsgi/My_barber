import { hasValidUserSession } from "@/lib/api/client";

/** React Query: faqat login bo‘lganda API chaqirish. */
export function authQueryEnabled(extra = true): boolean {
  return extra && hasValidUserSession();
}
