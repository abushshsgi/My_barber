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

export type ReferralInvitee = {
  id: number;
  full_name: string;
  phone_masked: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  badge?: string | null;
};

export type ReferralInfo = {
  code: string;
  invite_url: string;
  invite_count: number;
  invites?: ReferralInvitee[];
  referral_credits?: number;
  credit_per_invite?: number;
  trial?: ReferralTrialInfo;
  claimed?: boolean;
  already_granted?: boolean;
};

export async function fetchMyReferral(): Promise<ReferralInfo> {
  return apiJson<ReferralInfo>("/api/v1/users/me/referral/");
}

export async function claimReferralTrial(): Promise<ReferralInfo> {
  return apiJson<ReferralInfo>("/api/v1/users/me/referral/", { method: "POST" });
}
