import type { SignupFlow } from "@/lib/auth-ui";

const DRAFT_KEY = "barber_signup_draft_v1";

export type SignupDraft = {
  full_name: string;
  phone?: string;
  email: string;
  password: string;
  flow: SignupFlow;
};

export function saveSignupDraft(draft: SignupDraft): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function readSignupDraft(): SignupDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SignupDraft;
    if (!parsed.email || !parsed.password || !parsed.full_name || !parsed.flow) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
}

