import type { SignupFlow } from "@/lib/auth-ui";
import { getBarberAccessToken } from "@/lib/api";

const DRAFT_KEY = "barber_signup_draft_v1";
const PASSWORD_KEY = "barber_signup_password_v1";

export type SignupDraftStored = {
  full_name: string;
  phone: string;
  email: string;
  flow: SignupFlow;
};

export type SignupDraft = SignupDraftStored & {
  password: string;
};

let signupPasswordMemory: string | null = null;

export function setSignupPassword(password: string): void {
  signupPasswordMemory = password;
}

export function getSignupPassword(): string | null {
  return signupPasswordMemory;
}

export function clearSignupPassword(): void {
  signupPasswordMemory = null;
}

export function saveSignupDraft(draft: SignupDraft): void {
  setSignupPassword(draft.password);
  try {
    sessionStorage.setItem(PASSWORD_KEY, draft.password);
  } catch {
    /* sessionStorage blocked */
  }
  const stored: SignupDraftStored = {
    full_name: draft.full_name,
    phone: draft.phone,
    email: draft.email,
    flow: draft.flow,
  };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
}

export function readSignupDraft(): SignupDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SignupDraftStored;
    let password = getSignupPassword();
    if (!password) {
      try {
        password = sessionStorage.getItem(PASSWORD_KEY);
      } catch {
        password = null;
      }
      if (password) setSignupPassword(password);
    }
    if (!parsed.full_name || !parsed.flow || !password) return null;
    if (!parsed.email && !parsed.phone) return null;
    return { ...parsed, password };
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
  try {
    sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* ignore */
  }
  clearSignupPassword();
}

export function hasSignupSession(): boolean {
  if (getBarberAccessToken()) return true;
  try {
    if (sessionStorage.getItem(DRAFT_KEY) && sessionStorage.getItem(PASSWORD_KEY)) return true;
  } catch {
    /* ignore */
  }
  return !!getSignupPassword();
}
