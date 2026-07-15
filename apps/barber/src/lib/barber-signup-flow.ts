import {
  apiFetch,
  BARBER_SIGNUP_TIMEOUT_MS,
  getBarberAccessToken,
  setBarberTokens,
} from "@/lib/api";
import {
  resetBarberAuthFailureGuard,
  resetBarberSessionBootstrap,
} from "@/lib/barber-auth-session";
import { clearOnboardingStatusCache } from "@/lib/onboarding-status-cache";
import {
  extractApiError,
  formatFetchError,
  normalizeEmail,
  parseJsonSafe,
  type SignupFlow,
} from "@/lib/auth-ui";
import { clearSignupDraft, getSignupPassword, readSignupDraft, type SignupDraft } from "@/lib/signup-draft";

export type FlowPayload = {
  latitude?: number;
  longitude?: number;
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

async function registerAndStoreTokens(
  body: Record<string, unknown>,
  login: { email?: string; phone?: string },
  password: string,
): Promise<void> {
  const registerRes = await apiFetch("/api/v1/auth/barber-register/", {
    method: "POST",
    body: JSON.stringify(body),
    timeoutMs: BARBER_SIGNUP_TIMEOUT_MS,
  });
  const registerBody = await parseJsonSafe(registerRes);
  if (!registerRes.ok) {
    throw new Error(
      extractApiError(registerBody, "Ro'yxatdan o'tish amalga oshmadi.", registerRes),
    );
  }

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
      body: JSON.stringify(
        login.phone
          ? { phone: login.phone, password }
          : { email: login.email, password },
      ),
    });
    const loginBody = await parseJsonSafe(loginRes);
    if (!loginRes.ok) throw new Error(extractApiError(loginBody, "Login amalga oshmadi.", loginRes));
    const tokens = loginBody as { access?: string; refresh?: string };
    access = tokens.access;
    refresh = tokens.refresh;
  }
  if (!access || !refresh) throw new Error("Token qaytmadi.");
  clearOnboardingStatusCache();
  resetBarberAuthFailureGuard();
  resetBarberSessionBootstrap();
  setBarberTokens(access, refresh);
  clearSignupDraft();
}

/** Auth wizard oxirida — joylashuvsiz tez register (owner/mybarber/independent). */
export async function submitEarlyFlowSignup(flow: SignupFlow, draft: SignupDraft): Promise<void> {
  if (flow === "employee") {
    throw new Error("Employee oqimi salonga qo'shilishda register qilinadi.");
  }
  const email = draft.email.trim() ? normalizeEmail(draft.email) : "";
  const phoneE164 = draft.phone?.trim() ? draft.phone.trim() : "";
  const flowFields = deriveFlowFields(flow);
  await registerAndStoreTokens(
    {
      ...(email ? { email } : {}),
      ...(phoneE164 ? { phone: phoneE164 } : {}),
      password: draft.password,
      full_name: draft.full_name.trim(),
      onboarding_flow: flow,
      ...flowFields,
    },
    phoneE164 ? { phone: phoneE164 } : { email },
    draft.password,
  );
}

export async function submitFlowSignup(flow: SignupFlow, payload: FlowPayload): Promise<void> {
  if (getBarberAccessToken()) {
    clearSignupDraft();
    return;
  }

  const draft = readSignupDraft();
  const password = draft?.password ?? getSignupPassword();
  if (!draft || !password) throw new Error("Signup ma'lumoti topilmadi. Qaytadan boshlang.");

  const flowFields = deriveFlowFields(flow);
  const email = draft.email.trim() ? normalizeEmail(draft.email) : "";
  const phoneE164 = draft.phone?.trim() || "";

  const { latitude, longitude, full_name, phone, ...payloadRest } = payload;
  const registerBody: Record<string, unknown> = {
    ...(email ? { email } : {}),
    ...(phoneE164 || phone?.trim() ? { phone: phone?.trim() || phoneE164 } : {}),
    password,
    full_name: full_name?.trim() || draft.full_name,
    onboarding_flow: flow,
    ...flowFields,
    ...payloadRest,
  };
  if (latitude != null && longitude != null) {
    registerBody.latitude = roundCoord6(latitude);
    registerBody.longitude = roundCoord6(longitude);
  }

  await registerAndStoreTokens(
    registerBody,
    phoneE164 || phone?.trim() ? { phone: phone?.trim() || phoneE164 } : { email },
    password,
  );
}

/** Employee: draft + salon tanlash + GPS — backendda register va join bitta tranzaksiya. */
export async function submitEmployeeRegisterAndJoin(payload: {
  salon_id: number;
  latitude: number;
  longitude: number;
}): Promise<void> {
  const draft = readSignupDraft();
  const password = draft?.password ?? getSignupPassword();
  if (!draft || !password || draft.flow !== "employee") {
    throw new Error("Signup ma'lumoti topilmadi yoki bu oqim employee uchun emas.");
  }
  const email = draft.email.trim() ? normalizeEmail(draft.email) : "";
  const phoneE164 = draft.phone?.trim() || "";
  const res = await apiFetch("/api/v1/auth/barber-register-join-salon/", {
    method: "POST",
    timeoutMs: BARBER_SIGNUP_TIMEOUT_MS,
    body: JSON.stringify({
      ...(email ? { email } : {}),
      ...(phoneE164 ? { phone: phoneE164 } : {}),
      password,
      full_name: draft.full_name,
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
  clearOnboardingStatusCache();
  resetBarberAuthFailureGuard();
  resetBarberSessionBootstrap();
  setBarberTokens(tokens.access, tokens.refresh);
  clearSignupDraft();
}

export function formatSignupError(err: unknown, fallback: string): string {
  return formatFetchError(err, fallback);
}
