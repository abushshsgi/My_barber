import { apiFetch, setBarberTokens } from "@/lib/api";
import {
  extractApiError,
  formatFetchError,
  normalizeEmail,
  parseJsonSafe,
  type SignupFlow,
} from "@/lib/auth-ui";
import { clearSignupDraft, readSignupDraft } from "@/lib/signup-draft";

export type FlowPayload = {
  latitude: number;
  longitude: number;
  address?: string;
  region?: string;
  shop_name?: string;
  staff_count_at_signup?: number;
  full_name?: string;
  phone?: string;
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

  const { latitude, longitude, full_name, phone, ...payloadRest } = payload;
  const registerRes = await apiFetch("/api/v1/auth/barber-register/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: draft.password,
      full_name: full_name?.trim() || draft.full_name,
      phone: phone?.trim() || draft.phone || undefined,
      onboarding_flow: flow,
      ...flowFields,
      ...payloadRest,
      latitude: roundCoord6(latitude),
      longitude: roundCoord6(longitude),
    }),
  });
  const registerBody = await parseJsonSafe(registerRes);
  if (!registerRes.ok)
    throw new Error(
      extractApiError(registerBody, "Ro'yxatdan o'tish amalga oshmadi.", registerRes),
    );

  let access: string | undefined;
  let refresh: string | undefined;
  if (registerBody && typeof registerBody === "object") {
    const reg = registerBody as { access?: string; refresh?: string };
    access = reg.access;
    refresh = reg.refresh;
  }
  if (!access || !refresh) {
    const loginRes = await apiFetch("/api/v1/barber/auth/token/", {
      method: "POST",
      body: JSON.stringify({ email, password: draft.password }),
    });
    const loginBody = await parseJsonSafe(loginRes);
    if (!loginRes.ok)
      throw new Error(extractApiError(loginBody, "Login amalga oshmadi.", loginRes));
    const tokens = loginBody as { access?: string; refresh?: string };
    access = tokens.access;
    refresh = tokens.refresh;
  }
  if (!access || !refresh) throw new Error("Token qaytmadi.");
  setBarberTokens(access, refresh);
  clearSignupDraft();
}

/** Employee: draft + salon tanlash + GPS — backendda register va join bitta tranzaksiya. */
export async function submitEmployeeRegisterAndJoin(payload: {
  salon_id: number;
  latitude: number;
  longitude: number;
}): Promise<void> {
  const draft = readSignupDraft();
  if (!draft || draft.flow !== "employee") {
    throw new Error("Signup ma'lumoti topilmadi yoki bu oqim employee uchun emas.");
  }
  const email = normalizeEmail(draft.email);
  const res = await apiFetch("/api/v1/auth/barber-register-join-salon/", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: draft.password,
      full_name: draft.full_name,
      phone: draft.phone || "",
      salon_id: payload.salon_id,
      latitude: roundCoord6(payload.latitude),
      longitude: roundCoord6(payload.longitude),
    }),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      extractApiError(body, "Ro'yxatdan o'tish va salonga qo'shilish amalga oshmadi.", res),
    );
  }
  const tokens = body as { access?: string; refresh?: string };
  if (!tokens.access || !tokens.refresh) throw new Error("Token qaytmadi.");
  setBarberTokens(tokens.access, tokens.refresh);
  clearSignupDraft();
}
