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
  /** Obuna tasdiq belgesi: basic | plus | pro */
  badge?: string | null;
};

export type ReferralInfo = {
  code: string;
  invite_url: string;
  invite_count: number;
  invites?: ReferralInvitee[];
  trial?: ReferralTrialInfo;
  claimed?: boolean;
  already_granted?: boolean;
};

export async function fetchMyReferral(): Promise<ReferralInfo> {
  return apiJson<ReferralInfo>("/api/v1/users/me/referral/");
}

/** 3 ta referal to‘lganda Starter sinovni olish. */
export async function claimReferralTrial(): Promise<ReferralInfo> {
  return apiJson<ReferralInfo>("/api/v1/users/me/referral/", { method: "POST" });
}
