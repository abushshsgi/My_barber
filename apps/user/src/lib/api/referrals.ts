import { apiJson } from "./client";

export type ReferralTrialInfo = {
  required: number;
  days: number;
  plan: string;
  progress: number;
  eligible: boolean;
  granted: boolean;
  ends_at: string | null;
};

export type ReferralInfo = {
  code: string;
  invite_url: string;
  invite_count: number;
  trial?: ReferralTrialInfo;
};

export async function fetchMyReferral(): Promise<ReferralInfo> {
  return apiJson<ReferralInfo>("/api/v1/users/me/referral/");
}
