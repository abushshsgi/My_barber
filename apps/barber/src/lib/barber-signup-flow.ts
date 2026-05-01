import { apiFetch, setBarberTokens } from "@/lib/api";
import { extractApiError, normalizeEmail, parseJsonSafe, type SignupFlow } from "@/lib/auth-ui";
import { clearSignupDraft, readSignupDraft } from "@/lib/signup-draft";

export type FlowPayload = {
  latitude: number;
  longitude: number;
  address?: string;
  region?: string;
  shop_name?: string;
  staff_count_at_signup?: number;
};

/** Backend `DecimalField(max_digits=9, decimal_places=6)` — float JSON ba'zan 6 dan ortiq xona beradi. */
export function roundCoord6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function deriveFlowFields(flow: SignupFlow) {
  if (flow === "independent") {
    return { has_salon: false, work_mode: "independent" as const };
  }
  if (flow === "employee") {
    return { has_salon: true, work_mode: "salon" as const };
  }
  return { has_salon: false, work_mode: "salon" as const };
}

export function validateCoordinates(latitude: string, longitude: string): string | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return "Latitude va longitude raqam bo'lishi kerak.";
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return "Koordinatalar noto'g'ri diapazonda.";
  return null;
}

export async function submitFlowSignup(flow: SignupFlow, payload: FlowPayload): Promise<void> {
  const draft = readSignupDraft();
  if (!draft) throw new Error("Signup ma'lumoti topilmadi. Qaytadan boshlang.");

  const flowFields = deriveFlowFields(flow);
  const email = normalizeEmail(draft.email);

  const { latitude, longitude, ...payloadRest } = payload;
  const registerRes = await apiFetch("/api/v1/auth/barber-register/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: draft.password,
      full_name: draft.full_name,
      phone: draft.phone || undefined,
      onboarding_flow: flow,
      ...flowFields,
      ...payloadRest,
      latitude: roundCoord6(latitude),
      longitude: roundCoord6(longitude),
    }),
  });
  const registerBody = await parseJsonSafe(registerRes);
  if (!registerRes.ok)
    throw new Error(extractApiError(registerBody, "Ro'yxatdan o'tish amalga oshmadi."));

  const loginRes = await apiFetch("/api/v1/barber/auth/token/", {
    method: "POST",
    body: JSON.stringify({ email, password: draft.password }),
  });
  const loginBody = await parseJsonSafe(loginRes);
  if (!loginRes.ok) throw new Error(extractApiError(loginBody, "Login amalga oshmadi."));
  const tokens = loginBody as { access?: string; refresh?: string };
  if (!tokens.access || !tokens.refresh) throw new Error("Token qaytmadi.");
  setBarberTokens(tokens.access, tokens.refresh);
  clearSignupDraft();
}
