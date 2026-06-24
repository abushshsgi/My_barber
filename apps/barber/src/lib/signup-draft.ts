import type { SignupFlow } from "@/lib/auth-ui";

const DRAFT_KEY = "barber_signup_draft_v1";

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
    const password = getSignupPassword();
    if (!parsed.email || !password || !parsed.full_name || !parsed.flow || !parsed.phone) return null;
    return { ...parsed, password };
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
  clearSignupPassword();
}

export function hasSignupSession(): boolean {
  return !!sessionStorage.getItem(DRAFT_KEY) || !!getSignupPassword();
}
