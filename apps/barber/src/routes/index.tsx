import { createFileRoute, redirect } from "@tanstack/react-router";
import { getBarberAccessToken } from "@/lib/api";
import { readSignupDraft } from "@/lib/signup-draft";
import { SIGNUP_FLOW_PATH } from "@/lib/barber-flow-config";
import { resolveBarberEntryPath } from "@/lib/onboarding-redirect";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      throw redirect({ to: "/auth" });
    }
    if (getBarberAccessToken()) {
      const next = await resolveBarberEntryPath();
      if (next !== "/auth") {
        throw redirect({ to: next });
      }
    }
    const draft = readSignupDraft();
    if (draft?.flow && draft.flow in SIGNUP_FLOW_PATH) {
      throw redirect({ to: SIGNUP_FLOW_PATH[draft.flow] });
    }
    throw redirect({ to: "/auth" });
  },
});
