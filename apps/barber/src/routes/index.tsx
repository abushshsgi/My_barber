import { createFileRoute, redirect } from "@tanstack/react-router";
import { getBarberAccessToken } from "@/lib/api";
import { readSignupDraft } from "@/lib/signup-draft";
import { SIGNUP_FLOW_PATH } from "@/lib/barber-flow-config";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") {
      throw redirect({ to: "/auth" });
    }
    if (getBarberAccessToken()) {
      throw redirect({ to: "/barber" });
    }
    const draft = readSignupDraft();
    if (draft?.flow && draft.flow in SIGNUP_FLOW_PATH) {
      throw redirect({ to: SIGNUP_FLOW_PATH[draft.flow] });
    }
    throw redirect({ to: "/auth" });
  },
});
