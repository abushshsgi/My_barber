import { redirect } from "@tanstack/react-router";
import { getBarberAccessToken } from "@/lib/api";
import { hasJoinDraft } from "@/lib/join-draft";
import { hasSignupSession } from "@/lib/signup-draft";

/** Redirect to /auth when neither JWT nor signup draft exists. */
export function ensureBarberSignupAccess(): void {
  if (!getBarberAccessToken() && !hasSignupSession()) {
    throw redirect({ to: "/auth" });
  }
}

/** Salon join oqimi: JWT, signup draft yoki join draft bo‘lishi kerak. */
export function ensureSalonJoinAccess(): void {
  if (getBarberAccessToken() || hasSignupSession() || hasJoinDraft()) return;
  throw redirect({ to: "/auth" });
}

/** Setup sahifalari: token yoki signup draft (employee join setup). */
export function ensureBarberOnboardingAccess(): void {
  if (getBarberAccessToken() || hasSignupSession() || hasJoinDraft()) return;
  throw redirect({ to: "/auth" });
}
