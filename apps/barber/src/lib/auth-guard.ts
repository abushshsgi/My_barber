import { redirect } from "@tanstack/react-router";
import { getBarberAccessToken } from "@/lib/api";
import { hasSignupSession } from "@/lib/signup-draft";

/** Redirect to /auth when neither JWT nor signup draft exists. */
export function ensureBarberSignupAccess(): void {
  if (!getBarberAccessToken() && !hasSignupSession()) {
    throw redirect({ to: "/auth" });
  }
}
