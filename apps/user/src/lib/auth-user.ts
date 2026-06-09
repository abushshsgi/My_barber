import { getAuthUser } from "@/lib/auth";

export function getAuthUserId(): number | null {
  const id = getAuthUser()?.id;
  return typeof id === "number" ? id : null;
}
